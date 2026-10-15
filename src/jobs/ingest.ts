import { eq } from "drizzle-orm";
import { closeDb, db } from "@/db";
import { companies, ingestionRuns, secFilings } from "@/db/schema";
import { SecSubmissionsProvider } from "@/providers/sec/submissions";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

async function main() {
  const userAgent = process.env.SEC_USER_AGENT;
  const cik = process.env.SEC_CIK;
  if (!userAgent) throw new Error("Set SEC_USER_AGENT to a descriptive value with a monitored contact address.");
  if (!cik) throw new Error("Set SEC_CIK to a company identifier before running ingestion.");

  const provider = new SecSubmissionsProvider(userAgent);
  const normalizedCik = cik.replace(/\D/g, "").padStart(10, "0");
  const lookbackDays = Number.parseInt(process.env.SEC_LOOKBACK_DAYS ?? "30", 10);
  if (!Number.isInteger(lookbackDays) || lookbackDays < 1 || lookbackDays > 365) {
    throw new Error("SEC_LOOKBACK_DAYS must be an integer between 1 and 365.");
  }

  const startedAt = new Date();
  const [run] = await db.insert(ingestionRuns).values({
    provider: "sec-submissions",
    status: "running",
    startedAt,
    metadata: { cik: normalizedCik, lookbackDays },
  }).returning({ id: ingestionRuns.id });

  try {
    const filings = await provider.findRecentRegistrationFilings(
      normalizedCik,
      new Date(startedAt.getTime() - lookbackDays * DAY_IN_MS),
    );
    const companyName = filings[0]?.companyName;
    let companyId: string | undefined;

    if (companyName) {
      const [company] = await db.insert(companies).values({
        name: companyName,
        secCik: normalizedCik,
      }).onConflictDoUpdate({
        target: companies.secCik,
        set: { name: companyName, updatedAt: new Date() },
      }).returning({ id: companies.id });
      companyId = company.id;
    }

    let insertedCount = 0;
    if (companyId) {
      for (const filing of filings) {
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
    }

    await db.update(ingestionRuns).set({
      status: "completed",
      finishedAt: new Date(),
      recordsRead: filings.length,
      metadata: { cik: normalizedCik, lookbackDays, recordsInserted: insertedCount },
    }).where(eq(ingestionRuns.id, run.id));
    process.stdout.write(`SEC ingestion completed: ${filings.length} filings read, ${insertedCount} new filings stored.\n`);
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
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}).finally(async () => {
  await closeDb();
});
