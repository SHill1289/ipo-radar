# IPO Radar

IPO Radar is a Next.js and TypeScript starter for an IPO intelligence dashboard. The current screens use clearly labeled illustrative data; the application does not yet provide verified live IPO coverage.

## Local setup

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL` only when using persistence or ingestion.
3. Run `npm install` and `npm run dev`.
4. Open `http://localhost:3000`.

The dashboard and sample company pages render without a database. PostgreSQL is required for migrations and ingestion. Set a descriptive `SEC_USER_AGENT` and a company `SEC_CIK` before running `npm run ingest`. SEC ingestion currently fetches recent registration forms for one configured CIK, records a run, and reports filing count. Mapping SEC records to company/offerings rows is not implemented.

## Database

The Drizzle schema is in `src/db/schema.ts`. It covers companies, offerings, SEC filings, market snapshots, and ingestion runs. Apply the checked-in migration with `npm run db:migrate` after configuring `DATABASE_URL`.

## Data providers

`src/providers/types.ts` defines SEC and market quote boundaries. The SEC submissions adapter uses the SEC submissions JSON endpoint and requires a descriptive User-Agent. It is a per-CIK adapter, not a complete IPO discovery feed. Market data is deliberately disabled until a vendor and usage terms are selected. Credentials belong in environment variables and must never be committed.

## Routes

- `/` dashboard overview
- `/calendar` upcoming events calendar
- `/companies` company directory
- `/companies/[slug]` company and offering details

## Before public launch

Replace sample UI data with a normalized ingestion pipeline, add company matching and idempotent filing upserts, choose a market data provider, add authentication and user-owned watchlists, and review data licensing and source attribution requirements.
