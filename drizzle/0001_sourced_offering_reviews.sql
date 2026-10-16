ALTER TABLE "offerings" ADD COLUMN "source_type" text;
--> statement-breakpoint
ALTER TABLE "offerings" ADD COLUMN "source_url" text;
--> statement-breakpoint
ALTER TABLE "offerings" ADD COLUMN "source_checked_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "offerings" ADD COLUMN "reviewed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "offerings" ADD COLUMN "reviewed_by" text;
--> statement-breakpoint
CREATE TABLE "offering_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offering_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"reviewer_email" text NOT NULL,
	"source_type" text NOT NULL,
	"source_url" text NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"values_snapshot" jsonb NOT NULL,
	"notes" text,
	CONSTRAINT "offering_reviews_source_type_check" CHECK ("source_type" IN ('sec_filing', 'issuer_announcement'))
);
--> statement-breakpoint
ALTER TABLE "offering_reviews" ADD CONSTRAINT "offering_reviews_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "offering_reviews" ADD CONSTRAINT "offering_reviews_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "offering_reviews_company_reviewed_idx" ON "offering_reviews" USING btree ("company_id", "reviewed_at");
--> statement-breakpoint
CREATE INDEX "offering_reviews_offering_reviewed_idx" ON "offering_reviews" USING btree ("offering_id", "reviewed_at");
--> statement-breakpoint
ALTER TABLE "offering_reviews" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "offering_reviews" FROM anon, authenticated;
