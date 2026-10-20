import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres from "postgres";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required to baseline migrations.");

  const baselineMigrations = [
    { file: "drizzle/0000_ipo_radar.sql", appliedAt: 1792080000000 },
    { file: "drizzle/0001_sourced_offering_reviews.sql", appliedAt: 1792195200000 },
  ] as const;

  const migrations = await Promise.all(
    baselineMigrations.map(async (migration) => ({
      ...migration,
      hash: createHash("sha256").update(await readFile(migration.file, "utf8")).digest("hex"),
    })),
  );

  const client = postgres(connectionString, { max: 1, prepare: false });

  try {
    await client.begin(async (transaction) => {
      const [schemaState] = await transaction`
        SELECT
          to_regtype('public.ipo_status') IS NOT NULL AS has_ipo_status,
          to_regclass('public.companies') IS NOT NULL
            AND to_regclass('public.offerings') IS NOT NULL
            AND to_regclass('public.sec_filings') IS NOT NULL
            AND to_regclass('public.market_snapshots') IS NOT NULL
            AND to_regclass('public.ingestion_runs') IS NOT NULL AS has_base_tables,
          to_regclass('public.offering_reviews') IS NOT NULL AS has_review_table,
          (
            SELECT count(*) = 5
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'offerings'
              AND column_name IN ('source_type', 'source_url', 'source_checked_at', 'reviewed_at', 'reviewed_by')
          ) AS has_review_columns,
          (
            SELECT relrowsecurity
            FROM pg_class
            WHERE oid = to_regclass('public.offering_reviews')
          ) IS TRUE AS reviews_rls_enabled,
          NOT has_table_privilege('anon', 'public.offering_reviews', 'SELECT')
            AND NOT has_table_privilege('authenticated', 'public.offering_reviews', 'SELECT') AS reviews_not_public
      `;

      if (
        !schemaState.has_ipo_status ||
        !schemaState.has_base_tables ||
        !schemaState.has_review_table ||
        !schemaState.has_review_columns ||
        !schemaState.reviews_rls_enabled ||
        !schemaState.reviews_not_public
      ) {
        throw new Error("Existing database does not match the expected IPO Radar baseline; refusing to mark migrations as applied.");
      }

      await transaction`CREATE SCHEMA IF NOT EXISTS drizzle`;
      await transaction`
        CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
          id SERIAL PRIMARY KEY,
          hash text NOT NULL,
          created_at bigint
        )
      `;

      const applied = await transaction`
        SELECT hash, created_at::text AS created_at
        FROM drizzle.__drizzle_migrations
        ORDER BY created_at ASC
      `;

      if (applied.length === 0) {
        for (const migration of migrations) {
          await transaction`
            INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
            VALUES (${migration.hash}, ${migration.appliedAt})
          `;
        }
        console.info("Recorded the verified existing schema as the first two Drizzle migrations.");
        return;
      }

      const historyMatches = migrations.every(
        (migration, index) =>
          applied[index]?.hash === migration.hash &&
          Number(applied[index]?.created_at) === migration.appliedAt,
      );

      if (!historyMatches) {
        throw new Error("Drizzle migration history does not match the expected baseline; refusing to change it.");
      }

      console.info("Drizzle migration baseline is already recorded.");
    });
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
