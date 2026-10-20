ALTER TABLE "sec_filings" ADD COLUMN "extraction_status" text DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
ALTER TABLE "sec_filings" ADD COLUMN "extracted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "sec_filings" ADD COLUMN "extraction_error" text;
--> statement-breakpoint
ALTER TABLE "sec_filings" ADD COLUMN "extracted_data" jsonb;
