import { desc, isNotNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getAdminUser } from "@/lib/supabase/server";
import { saveOfferingReview } from "./actions";

export const dynamic = "force-dynamic";

function dateInput(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function formatReviewedAt(value: Date) {
  return value.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" });
}

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ message?: string; company?: string }> }) {
  const user = await getAdminUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const [{ db }, schema] = await Promise.all([import("@/db"), import("@/db/schema")]);
  const [companyRows, offeringRows, filingRows, reviewRows] = await Promise.all([
    db.select({ id: schema.companies.id, name: schema.companies.name, ticker: schema.companies.ticker, secCik: schema.companies.secCik })
      .from(schema.companies).orderBy(schema.companies.name).limit(500),
    db.select().from(schema.offerings).orderBy(desc(schema.offerings.updatedAt)).limit(1000),
    db.select({ companyId: schema.secFilings.companyId, formType: schema.secFilings.formType, filedAt: schema.secFilings.filedAt, filingUrl: schema.secFilings.filingUrl })
      .from(schema.secFilings).where(isNotNull(schema.secFilings.companyId)).orderBy(desc(schema.secFilings.filedAt)).limit(2000),
    db.select({ companyId: schema.offeringReviews.companyId, sourceType: schema.offeringReviews.sourceType, sourceUrl: schema.offeringReviews.sourceUrl, reviewedAt: schema.offeringReviews.reviewedAt, reviewerEmail: schema.offeringReviews.reviewerEmail, valuesSnapshot: schema.offeringReviews.valuesSnapshot })
      .from(schema.offeringReviews).orderBy(desc(schema.offeringReviews.reviewedAt)).limit(500),
  ]);

  const latestOffering = new Map<string, (typeof offeringRows)[number]>();
  for (const offering of offeringRows) if (!latestOffering.has(offering.companyId)) latestOffering.set(offering.companyId, offering);
  const latestFiling = new Map<string, (typeof filingRows)[number]>();
  for (const filing of filingRows) if (filing.companyId && !latestFiling.has(filing.companyId)) latestFiling.set(filing.companyId, filing);
  return <AppShell active="Review IPO details"><div className="page-wrap review-wrap">
    <div className="page-heading"><div><div className="eyebrow">PRIVATE · SOURCED DATA</div><h1>Review IPO details</h1><p>Update dates and offering terms only when a primary source supports them.</p></div>
      <form action="/auth/signout" method="post"><button className="button button-secondary" type="submit">Sign out</button></form>
    </div>
    <section className="review-notice"><strong>Primary-source rule</strong><span>Every saved update requires a public SEC filing or issuer-announcement URL. Each save adds a dated audit entry; it never implies an unconfirmed date.</span></section>
    {params.message === "saved" ? <div className="review-feedback success" role="status">Review saved and the public company and calendar pages refreshed.</div> : null}
    {params.message === "invalid" ? <div className="review-feedback" role="alert">Some fields are invalid. Check dates, numeric values, and required source details.</div> : null}
    {params.message === "source" ? <div className="review-feedback" role="alert">Use a secure HTTPS source URL. SEC filing sources must link to sec.gov.</div> : null}
    {params.message === "prices" ? <div className="review-feedback" role="alert">The lower end of the price range must not exceed the upper end.</div> : null}
    {params.message === "company" ? <div className="review-feedback" role="alert">That company could not be found. Refresh the review queue.</div> : null}
    {params.message === "save-error" ? <div className="review-feedback" role="alert">The update could not be saved. Please try again.</div> : null}
    <div className="review-queue-heading"><div><h2>Companies from SEC filings</h2><p>{companyRows.length} companies · newest filings shown where available</p></div><span>{user.email}</span></div>
    <div className="review-queue">{companyRows.map((company) => {
      const offering = latestOffering.get(company.id);
      const filing = latestFiling.get(company.id);
      const reviews = reviewRows.filter((review) => review.companyId === company.id).slice(0, 3);
      const selected = params.company === `cik-${company.secCik}`;
      return <details className="panel review-card" key={company.id} open={selected}>
        <summary><span><strong>{company.name}</strong><small>{company.ticker ?? "Ticker not announced"}{company.secCik ? ` · CIK ${company.secCik}` : ""}</small></span>
          <span className="review-summary-meta">{offering ? <StatusBadge status={offering.status} /> : <span className="unreviewed-badge">Needs review</span>}{filing ? <small>Latest: {filing.formType} · {formatReviewedAt(filing.filedAt)}</small> : null}</span>
        </summary>
        {filing ? <div className="review-filing-link"><a className="text-link" href={filing.filingUrl} target="_blank" rel="noreferrer">Open latest {filing.formType} on SEC EDGAR</a></div> : null}
        <form action={saveOfferingReview} className="review-form review-fields">
          <input type="hidden" name="companyId" value={company.id} />
          <label>Status<select name="status" defaultValue={offering?.status ?? "filed"}><option value="rumored">Rumored</option><option value="filed">Filed</option><option value="upcoming">Upcoming</option><option value="withdrawn">Withdrawn</option><option value="completed">Completed</option></select></label>
          <label>Expected listing date<input name="expectedDate" type="date" defaultValue={dateInput(offering?.expectedDate)} /></label>
          <label>Price range — low<input name="priceLow" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={offering?.priceLow ?? ""} /></label>
          <label>Price range — high<input name="priceHigh" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={offering?.priceHigh ?? ""} /></label>
          <label>Final price<input name="finalPrice" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={offering?.finalPrice ?? ""} /></label>
          <label>Shares offered<input name="sharesOffered" type="number" min="0" step="1" inputMode="numeric" defaultValue={offering?.sharesOffered ?? ""} /></label>
          <label>Source type<select name="sourceType" defaultValue={offering?.sourceType ?? "sec_filing"}><option value="sec_filing">SEC filing</option><option value="issuer_announcement">Issuer announcement</option></select></label>
          <label className="source-url-field">Source URL<input name="sourceUrl" type="url" inputMode="url" required defaultValue={offering?.sourceUrl ?? (filing?.filingUrl ?? "")} placeholder="https://www.sec.gov/..." /></label>
          <label className="review-notes-field">Review notes<textarea name="notes" rows={2} maxLength={1200} placeholder="Optional context from the cited primary source" /></label>
          <div className="review-submit"><button className="button button-primary" type="submit">Save sourced review</button>{offering?.reviewedAt ? <span>Last reviewed {formatReviewedAt(offering.reviewedAt)}{offering.reviewedBy ? ` by ${offering.reviewedBy}` : ""}</span> : null}</div>
        </form>
        {reviews.length ? <div className="review-history"><strong>Recent review history</strong>{reviews.map((review, index) => <div className="review-history-row" key={`${review.companyId}-${review.reviewedAt.toISOString()}-${index}`}><span>{formatReviewedAt(review.reviewedAt)} · {review.reviewerEmail}</span><a href={review.sourceUrl} target="_blank" rel="noreferrer">{review.sourceType === "sec_filing" ? "SEC filing" : "Issuer announcement"}</a></div>)}</div> : null}
      </details>;
    })}</div>
    {companyRows.length === 0 ? <section className="panel filing-empty"><span>—</span><div><strong>No companies in the queue</strong><p>Companies will appear here after the scheduled SEC filing import runs.</p></div></section> : null}
    <div className="data-note">Editing is restricted to the configured admin email. Public pages display only the latest saved values and source link.</div>
  </div></AppShell>;
}
