import { and, eq, gte, inArray, isNotNull } from "drizzle-orm";
import { closeDb, db } from "@/db";
import { companies, ingestionRuns, offerings, secFilings } from "@/db/schema";
import { SecFilingDocumentProvider } from "@/providers/sec/filing-document";
import { SecLatestFilingsProvider } from "@/providers/sec/latest-filings";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

async function main() {
  const userAgent = process.env.SEC_USER_AGENT;
  if (!userAgent) throw new Error("Set SEC_USER_AGENT to a descriptive value with a monitored contact address.");

  const provider = new SecLatestFilingsProvider(userAgent);
  const documentProvider = new SecFilingDocumentProvider(userAgent);
  const lookbackDays = Number.parseInt(process.env.SEC_LOOKBACK_DAYS ?? "7", 10);
  if (!Number.isInteger(lookbackDays) || lookbackDays < 1 || lookbackDays > 365) {
    throw new Error("SEC_LOOKBACK_DAYS must be an integer between 1 and 365.");
  }

  const startedAt = new Date();
  const [run] = await db.insert(ingestionRuns).values({
    provider: "sec-latest-filings",
    status: "running",
    startedAt,
    metadata: { lookbackDays },
  }).returning({ id: ingestionRuns.id });

  try {
    const filings = await provider.findRecentRegistrationFilings(
      new Date(startedAt.getTime() - lookbackDays * DAY_IN_MS),
    );
    const companyIds = new Map<string, string>();
    let insertedCount = 0;

    for (const filing of filings) {
      let companyId = companyIds.get(filing.cik);
      if (!companyId) {
        const [company] = await db.insert(companies).values({
          name: filing.companyName ?? "Unknown SEC filer",
          secCik: filing.cik,
        }).onConflictDoUpdate({
          target: companies.secCik,
          set: { name: filing.companyName ?? "Unknown SEC filer", updatedAt: new Date() },
        }).returning({ id: companies.id });
        companyId = company.id;
        companyIds.set(filing.cik, companyId);
      }

      const inserted = await db.insert(secFilings).values({
        companyId,
        cik: filing.cik,
        accessionNumber: filing.accessionNumber,
        formType: filing.formType,
        filedAt: filing.filedAt,
        filingUrl: filing.filingUrl,
        raw: filing,
      }).onConflictDoNothing({
        target: secFilings.accessionNumber,
      }).returning({ id: secFilings.id });
      insertedCount += inserted.length;
    }

    const pendingFilings = await db.select({
      id: secFilings.id,
      companyId: secFilings.companyId,
      cik: secFilings.cik,
      accessionNumber: secFilings.accessionNumber,
      formType: secFilings.formType,
      filedAt: secFilings.filedAt,
      filingUrl: secFilings.filingUrl,
    }).from(secFilings)
      .where(and(
        gte(secFilings.filedAt, new Date(startedAt.getTime() - lookbackDays * DAY_IN_MS)),
        inArray(secFilings.extractionStatus, ["pending", "failed"]),
        isNotNull(secFilings.companyId),
      ));
    const recentFilings = await db.select({
      companyId: secFilings.companyId,
      accessionNumber: secFilings.accessionNumber,
      filedAt: secFilings.filedAt,
    }).from(secFilings).where(and(
      gte(secFilings.filedAt, new Date(startedAt.getTime() - lookbackDays * DAY_IN_MS)),
      inArray(secFilings.formType, ["S-1", "S-1/A", "F-1", "F-1/A"]),
      isNotNull(secFilings.companyId),
    ));
    const newestFilingByCompany = new Map<string, { accessionNumber: string; filedAt: Date }>();
    for (const filing of recentFilings) {
      if (!filing.companyId) continue;
      const current = newestFilingByCompany.get(filing.companyId);
      if (!current || filing.filedAt > current.filedAt) {
        newestFilingByCompany.set(filing.companyId, { accessionNumber: filing.accessionNumber, filedAt: filing.filedAt });
      }
    }

    let extractedCount = 0;
    let extractionFailureCount = 0;
    let offeringCount = 0;
    let reviewedOfferingCount = 0;
    for (const filing of pendingFilings) {
      try {
        const terms = await documentProvider.extractOfferingTerms(filing);
        const extractedAt = new Date();
        await db.update(secFilings).set({
          extractionStatus: "completed",
          extractedAt,
          extractionError: null,
          extractedData: terms,
        }).where(eq(secFilings.id, filing.id));
        extractedCount += 1;

        if (!terms.isIpoCandidate || !filing.companyId || newestFilingByCompany.get(filing.companyId)?.accessionNumber !== filing.accessionNumber) continue;
        const [existingOffering] = await db.select({
          id: offerings.id,
          reviewedAt: offerings.reviewedAt,
        }).from(offerings).where(eq(offerings.companyId, filing.companyId)).limit(1);
        if (existingOffering?.reviewedAt) {
          reviewedOfferingCount += 1;
          continue;
        }

        const automaticValues = {
          status: "filed" as const,
          filingDate: filing.filedAt,
          secAccession: filing.accessionNumber,
          source: "sec_auto",
          sourceType: "sec_filing",
          sourceUrl: terms.documentUrl,
          sourceCheckedAt: extractedAt,
          updatedAt: extractedAt,
          priceLow: terms.priceLow,
          priceHigh: terms.priceHigh,
          sharesOffered: terms.sharesOffered,
        };
        if (existingOffering) {
          await db.update(offerings).set(automaticValues).where(eq(offerings.id, existingOffering.id));
        } else {
          await db.insert(offerings).values({ companyId: filing.companyId, ...automaticValues });
        }
        offeringCount += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown SEC filing extraction error";
        await db.update(secFilings).set({
          extractionStatus: "failed",
          extractedAt: new Date(),
          extractionError: message.slice(0, 1000),
        }).where(eq(secFilings.id, filing.id));
        extractionFailureCount += 1;
      }
    }

    await db.update(ingestionRuns).set({
      status: "completed",
      finishedAt: new Date(),
      recordsRead: filings.length,
      metadata: {
        lookbackDays,
        recordsInserted: insertedCount,
        companiesFound: companyIds.size,
        filingsExtracted: extractedCount,
        extractionFailures: extractionFailureCount,
        offeringsCreatedOrUpdated: offeringCount,
        reviewedOfferingsProtected: reviewedOfferingCount,
      },
    }).where(eq(ingestionRuns.id, run.id));
    process.stdout.write("SEC ingestion completed: " + filings.length + " filings read, " + insertedCount + " new filings stored, " + extractedCount + " documents extracted, " + offeringCount + " IPO records created or refreshed, " + extractionFailureCount + " extraction failures.\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingestion error";
    await db.update(ingestionRuns).set({
      status: "failed",
      finishedAt: new Date(),
      errorMessage: message,
    }).where(eq(ingestionRuns.id, run.id));
    throw error;
  }
}

main().catch((error: unknown) => {
  process.stderr.write((error instanceof Error ? error.message : String(error)) + "\n");
  process.exitCode = 1;
}).finally(async () => {
  await closeDb();
});
