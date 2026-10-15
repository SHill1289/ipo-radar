import { pgEnum, pgTable, text, timestamp, uuid, numeric, integer, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";

export const ipoStatus = pgEnum("ipo_status", ["rumored", "filed", "upcoming", "withdrawn", "completed"]);
export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), ticker: text("ticker"), exchange: text("exchange"),
  industry: text("industry"), description: text("description"), website: text("website"),
  secCik: text("sec_cik"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("companies_cik_unique").on(table.secCik), index("companies_ticker_idx").on(table.ticker)]);

export const offerings = pgTable("offerings", {
  id: uuid("id").defaultRandom().primaryKey(), companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  status: ipoStatus("status").default("rumored").notNull(), filingDate: timestamp("filing_date", { withTimezone: true }),
  expectedDate: timestamp("expected_date", { withTimezone: true }), pricedDate: timestamp("priced_date", { withTimezone: true }),
  sharesOffered: numeric("shares_offered", { precision: 20, scale: 0 }), priceLow: numeric("price_low", { precision: 12, scale: 2 }),
  priceHigh: numeric("price_high", { precision: 12, scale: 2 }), finalPrice: numeric("final_price", { precision: 12, scale: 2 }),
  dealSize: numeric("deal_size", { precision: 20, scale: 2 }), leadUnderwriters: text("lead_underwriters").array(),
  secAccession: text("sec_accession"), source: text("source").notNull().default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("offerings_expected_date_idx").on(table.expectedDate), index("offerings_status_idx").on(table.status)]);

export const secFilings = pgTable("sec_filings", {
  id: uuid("id").defaultRandom().primaryKey(), companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  cik: text("cik").notNull(), accessionNumber: text("accession_number").notNull(), formType: text("form_type").notNull(),
  filedAt: timestamp("filed_at", { withTimezone: true }).notNull(), filingUrl: text("filing_url").notNull(),
  raw: jsonb("raw"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("sec_filings_accession_unique").on(table.accessionNumber), index("sec_filings_cik_filed_idx").on(table.cik, table.filedAt)]);

export const marketSnapshots = pgTable("market_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(), companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  capturedAt: timestamp("captured_at", { withTimezone: true }).defaultNow().notNull(), price: numeric("price", { precision: 12, scale: 4 }),
  changePercent: numeric("change_percent", { precision: 8, scale: 4 }), volume: numeric("volume", { precision: 24, scale: 0 }), provider: text("provider").notNull(),
});

export const ingestionRuns = pgTable("ingestion_runs", {
  id: uuid("id").defaultRandom().primaryKey(), provider: text("provider").notNull(), status: text("status").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(), finishedAt: timestamp("finished_at", { withTimezone: true }),
  recordsRead: integer("records_read").default(0).notNull(), errorMessage: text("error_message"), metadata: jsonb("metadata"),
});
