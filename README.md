# IPO Radar

IPO Radar is a Next.js and TypeScript IPO intelligence dashboard. The overview reads recent SEC registration filings and import status from PostgreSQL; company and calendar screens still contain illustrative data.

## Local setup

1. Install Node.js 20.9 or newer.
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL` to use the dashboard, persistence, or ingestion.
3. Run `npm ci` and `npm run dev`.
4. Open `http://localhost:3000`.

The overview displays an honest setup or no-filings state if the database is unavailable or no matching filings have been ingested. PostgreSQL is required for the overview, migrations, and ingestion. Set a descriptive `SEC_USER_AGENT` before running `npm run ingest`. SEC ingestion discovers recent registration filings and stores companies, filings, and ingestion runs; mapping SEC records to IPO offerings is not yet implemented.

## Free personal hosting

The intended low-cost personal setup is Vercel Hobby for the Next.js site, Supabase Free for PostgreSQL, and GitHub Actions for scheduled SEC ingestion. Vercel Hobby cron is limited to once daily, so ingestion runs from `.github/workflows/sec-ingest.yml` instead. Its five UTC schedules roughly align with 9 a.m., noon, 3 p.m., 6 p.m., and 9 p.m. Eastern during daylight saving time; adjust them by one hour after the seasonal clock change if exact local times matter.

After creating a Supabase project, set the GitHub repository Actions secret `DATABASE_URL` to its PostgreSQL connection string and the repository Actions variable `SEC_USER_AGENT` to a descriptive identifier with a monitored contact. Apply the schema to the Supabase database with `npm run db:migrate` before enabling ingestion. Set the same `DATABASE_URL` as a server-side Production environment variable in Vercel for the overview to query Supabase. Redeploy after changing Vercel variables. Do not commit credentials.

## Database

The Drizzle schema is in `src/db/schema.ts`. It covers companies, offerings, SEC filings, market snapshots, and ingestion runs. Apply the checked-in migration with `npm run db:migrate` after configuring `DATABASE_URL`.

## Data providers

`src/providers/types.ts` defines SEC and market quote boundaries. The SEC latest-filings adapter discovers registration filings using the SEC filings feed and requires a descriptive User-Agent. Market data is deliberately disabled until a vendor and usage terms are selected. Credentials belong in environment variables and must never be committed.

## Routes

- `/` dashboard overview
- `/calendar` upcoming events calendar
- `/companies` company directory
- `/companies/[slug]` company and offering details

## Before public launch

Replace sample company and calendar data with the ingestion pipeline, add company matching and idempotent offering upserts, choose a market data provider, add authentication and user-owned watchlists, and review data licensing and source attribution requirements.
