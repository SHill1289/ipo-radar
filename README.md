# IPO Radar

IPO Radar is a Next.js and TypeScript IPO intelligence dashboard. The dashboard, calendar, and company pages read SEC filings and reviewed offering records from PostgreSQL.

## Local setup

1. Install Node.js 22 or newer.
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL` to use the dashboard, persistence, or ingestion.
3. Run `npm ci` and `npm run dev`.
4. Open `http://localhost:3000`.

The overview displays an honest setup or no-filings state if the database is unavailable or no matching filings have been ingested. PostgreSQL is required for the overview, migrations, and ingestion. Set a descriptive `SEC_USER_AGENT` before running `npm run ingest`. SEC ingestion discovers recent registration filings, stores companies and filings, fetches the primary S-1/F-1 document, and extracts price-range/share-count candidates when the filing text contains clear cover-page cues. Each latest filing creates or refreshes a source-linked `filed` offering without inventing an expected listing date. These machine-extracted values are labeled as not independently verified; admin-reviewed records are protected from automatic overwrites. Extraction failures are recorded and retried on later scheduled runs.

## Free personal hosting

The intended low-cost personal setup is Vercel Hobby for the Next.js site, Supabase Free for PostgreSQL, and GitHub Actions for scheduled SEC ingestion. Vercel Hobby cron is limited to once daily, so ingestion runs from `.github/workflows/sec-ingest.yml` instead. Its five UTC schedules roughly align with 9 a.m., noon, 3 p.m., 6 p.m., and 9 p.m. Eastern during daylight saving time; adjust them by one hour after the seasonal clock change if exact local times matter.

After creating a Supabase project, set the GitHub repository Actions secret `DATABASE_URL` to its PostgreSQL connection string and the repository Actions variable `SEC_USER_AGENT` to a descriptive identifier with a monitored contact. Apply the schema to the Supabase database with `npm run db:migrate` before enabling ingestion. Set the same `DATABASE_URL` as a server-side Production environment variable in Vercel for the overview to query Supabase. Redeploy after changing Vercel variables. Do not commit credentials.

## Private offering review

The `/review` area uses Supabase Auth email links and permits only the address in `IPO_RADAR_ADMIN_EMAIL`. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `IPO_RADAR_ADMIN_EMAIL`, and `NEXT_PUBLIC_SITE_URL` in Vercel and local development. The configured reviewer must already exist in Supabase Auth; self-registration is disabled. Add the site's `/auth/confirm` URL to Supabase Auth's allowed redirect URLs. The callback supports Supabase's default Magic Link template, so custom SMTP and email-template edits are not required. Then apply the latest Drizzle migration with `npm run db:migrate`. Every saved offering update requires an HTTPS SEC filing or issuer-announcement URL and adds an append-only review-history row; no source URL is fetched by the app.

## Database

The Drizzle schema is in `src/db/schema.ts`. It covers companies, offerings, SEC filings and their extraction status/results, market snapshots, and ingestion runs. Apply the checked-in migrations with `npm run db:migrate` after configuring `DATABASE_URL`.

## Data providers

`src/providers/types.ts` defines SEC and market quote boundaries. SEC adapters discover current registration filings and extract conservative IPO terms from the primary registration document using a descriptive User-Agent, with requests rate-limited below the SEC's published maximum. Automated extraction is source-backed but is not a substitute for independent verification. Market data is deliberately disabled until a vendor and usage terms are selected. Credentials belong in environment variables and must never be committed.

## Routes

- `/` dashboard overview
- `/calendar` upcoming events calendar
- `/companies` company directory
- `/companies/[slug]` company and offering details
- `/login` private reviewer email-link sign-in
- `/review` admin-only sourced offering editor and review history

## Before public launch

Improve structured-field extraction and issuer/underwriter corroboration, choose a market data provider, add user-owned watchlists, and review data licensing and source attribution requirements.
