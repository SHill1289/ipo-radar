CREATE TYPE "public"."ipo_status" AS ENUM('rumored', 'filed', 'upcoming', 'withdrawn', 'completed');--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"ticker" text,
	"exchange" text,
	"industry" text,
	"description" text,
	"website" text,
	"sec_cik" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "offerings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"status" "ipo_status" DEFAULT 'rumored' NOT NULL,
	"filing_date" timestamp with time zone,
	"expected_date" timestamp with time zone,
	"priced_date" timestamp with time zone,
	"shares_offered" numeric(20, 0),
	"price_low" numeric(12, 2),
	"price_high" numeric(12, 2),
	"final_price" numeric(12, 2),
	"deal_size" numeric(20, 2),
	"lead_underwriters" text[],
	"sec_accession" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "sec_filings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"cik" text NOT NULL,
	"accession_number" text NOT NULL,
	"form_type" text NOT NULL,
	"filed_at" timestamp with time zone NOT NULL,
	"filing_url" text NOT NULL,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "market_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"price" numeric(12, 4),
	"change_percent" numeric(8, 4),
	"volume" numeric(24, 0),
	"provider" text NOT NULL
);--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"records_read" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"metadata" jsonb
);--> statement-breakpoint
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sec_filings" ADD CONSTRAINT "sec_filings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_snapshots" ADD CONSTRAINT "market_snapshots_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "companies_cik_unique" ON "companies" USING btree ("sec_cik");--> statement-breakpoint
CREATE INDEX "companies_ticker_idx" ON "companies" USING btree ("ticker");--> statement-breakpoint
CREATE INDEX "offerings_expected_date_idx" ON "offerings" USING btree ("expected_date");--> statement-breakpoint
CREATE INDEX "offerings_status_idx" ON "offerings" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "sec_filings_accession_unique" ON "sec_filings" USING btree ("accession_number");--> statement-breakpoint
CREATE INDEX "sec_filings_cik_filed_idx" ON "sec_filings" USING btree ("cik", "filed_at");
