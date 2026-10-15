import { eq } from "drizzle-orm";
import { closeDb, db } from "@/db";
import { companies, ingestionRuns, secFilings } from "@/db/schema";
import { SecLatestFilingsProvider } from "@/providers/sec/latest-filings";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

async function main() {
  const userAgent = process.env.SEC_USER_AGENT;
  if (!userAgent) throw new Error("Set SEC_USER_AGENT to a descriptive value with a monitored contact address.");

  const provider = new SecLatestFilingsProvider(userAgent);
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

    await db.update(ingestionRuns).set({
      status: "completed",
      finishedAt: new Date(),
      recordsRead: filings.length,
      metadata: { lookbackDays, recordsInserted: insertedCount, companiesFound: companyIds.size },
    }).where(eq(ingestionRuns.id, run.id));
    process.stdout.write("SEC ingestion completed: " + filings.length + " filings read, " + insertedCount + " new filings stored.\n");
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
