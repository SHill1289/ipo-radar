import { SecSubmissionsProvider } from "@/providers/sec/submissions";
import { db } from "@/db";
import { ingestionRuns } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const provider = new SecSubmissionsProvider(process.env.SEC_USER_AGENT ?? "");
  const cik = process.env.SEC_CIK;
  if (!cik) throw new Error("Set SEC_CIK to a company identifier before running ingestion.");
  const startedAt = new Date();
  const [run] = await db.insert(ingestionRuns).values({ provider: "sec-submissions", status: "running", startedAt }).returning({ id: ingestionRuns.id });
  try {
    const filings = await provider.findRecentRegistrationFilings(cik, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    await db.update(ingestionRuns).set({ status: "completed", finishedAt: new Date(), recordsRead: filings.length, metadata: { note: "Fetched filings; persistence mapping is intentionally not enabled yet." } }).where(eq(ingestionRuns.id, run.id));
    process.stdout.write(`Fetched ${filings.length} recent registration filings. Persistence mapping remains a follow-up.\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingestion error";
    await db.update(ingestionRuns).set({ status: "failed", finishedAt: new Date(), errorMessage: message }).where(eq(ingestionRuns.id, run.id));
    throw error;
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
