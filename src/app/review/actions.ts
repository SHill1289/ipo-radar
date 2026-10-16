"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";

const optionalDate = z.string().trim().refine((value) => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Enter a valid date.").transform((value) => value || null);

const decimal = (digits: number) => z.string().trim().refine((value) => !value || new RegExp(`^\\d{1,${digits}}(\\.\\d{1,2})?$`).test(value), "Enter a positive amount with up to two decimal places.").transform((value) => value || null);

const reviewInput = z.object({
  companyId: z.string().uuid(),
  status: z.enum(["rumored", "filed", "upcoming", "withdrawn", "completed"]),
  expectedDate: optionalDate,
  priceLow: decimal(10),
  priceHigh: decimal(10),
  finalPrice: decimal(10),
  sharesOffered: z.string().trim().refine((value) => !value || /^\d{1,20}$/.test(value), "Enter a whole number of shares.").transform((value) => value || null),
  sourceType: z.enum(["sec_filing", "issuer_announcement"]),
  sourceUrl: z.string().trim().url().max(2048),
  notes: z.string().trim().max(1200),
});

export async function saveOfferingReview(formData: FormData) {
  const user = await getAdminUser();
  if (!user?.email) redirect("/login");

  const parsed = reviewInput.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect("/review?message=invalid");
  const values = parsed.data;
  const sourceUrl = new URL(values.sourceUrl);
  if (sourceUrl.protocol !== "https:" || sourceUrl.username || sourceUrl.password) redirect("/review?message=source");
  if (values.sourceType === "sec_filing" && sourceUrl.hostname !== "sec.gov" && !sourceUrl.hostname.endsWith(".sec.gov")) redirect("/review?message=source");
  if (values.priceLow && values.priceHigh && Number(values.priceLow) > Number(values.priceHigh)) redirect("/review?message=prices");

  const [{ db }, schema] = await Promise.all([import("@/db"), import("@/db/schema")]);
  const [company] = await db.select({ id: schema.companies.id, secCik: schema.companies.secCik })
    .from(schema.companies).where(eq(schema.companies.id, values.companyId)).limit(1);
  if (!company) redirect("/review?message=company");

  const reviewedAt = new Date();
  const expectedDate = values.expectedDate ? new Date(`${values.expectedDate}T12:00:00.000Z`) : null;
  const offeringValues = {
    status: values.status,
    expectedDate,
    priceLow: values.priceLow,
    priceHigh: values.priceHigh,
    finalPrice: values.finalPrice,
    sharesOffered: values.sharesOffered,
    source: values.sourceType,
    sourceType: values.sourceType,
    sourceUrl: sourceUrl.toString(),
    sourceCheckedAt: reviewedAt,
    reviewedAt,
    reviewedBy: user.email.toLowerCase(),
    updatedAt: reviewedAt,
  };
  const valuesSnapshot = {
    status: values.status,
    expectedDate: values.expectedDate,
    priceLow: values.priceLow,
    priceHigh: values.priceHigh,
    finalPrice: values.finalPrice,
    sharesOffered: values.sharesOffered,
  };

  try {
    await db.transaction(async (transaction) => {
      const [existing] = await transaction.select({ id: schema.offerings.id })
        .from(schema.offerings)
        .where(eq(schema.offerings.companyId, company.id))
        .orderBy(desc(schema.offerings.updatedAt))
        .limit(1);
      const [offering] = existing
        ? await transaction.update(schema.offerings).set(offeringValues).where(eq(schema.offerings.id, existing.id)).returning({ id: schema.offerings.id })
        : await transaction.insert(schema.offerings).values({ companyId: company.id, ...offeringValues }).returning({ id: schema.offerings.id });

      await transaction.insert(schema.offeringReviews).values({
        offeringId: offering.id,
        companyId: company.id,
        reviewerEmail: user.email!.toLowerCase(),
        sourceType: values.sourceType,
        sourceUrl: sourceUrl.toString(),
        reviewedAt,
        valuesSnapshot,
        notes: values.notes || null,
      });
    });
  } catch {
    redirect("/review?message=save-error");
  }

  revalidatePath("/review");
  revalidatePath("/companies");
  revalidatePath("/calendar");
  revalidatePath("/companies/[slug]", "page");
  redirect(`/review?message=saved${company.secCik ? `&company=cik-${company.secCik}` : ""}`);
}
