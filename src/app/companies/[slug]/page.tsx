import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getCompanyDetail } from "@/lib/ipo-pages-data";
import { ArrowLeft, ArrowUpRight, ExternalLink, FileText } from "lucide-react";

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const shortDateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function formatMoney(value: string | null) {
  if (value === null) return "Not announced";
  const amount = Number(value);
  return Number.isFinite(amount) ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount) : "Not announced";
}

function formatPriceRange(low: string | null, high: string | null) {
  if (low && high && low !== high) return `${formatMoney(low)}–${formatMoney(high)}`;
  return formatMoney(low ?? high);
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { state, company, offerings, filings } = await getCompanyDetail(slug);
  if (state === "connected" && !company) notFound();

  if (!company) return <AppShell active="Companies"><div className="page-wrap company-detail-wrap">
    <Link className="back-link" href="/companies"><ArrowLeft size={14} /> All companies</Link>
    <div className="panel filing-empty"><span><FileText size={19} /></span><div>
      <strong>{state === "unconfigured" ? "Database setup needed" : "Company data unavailable"}</strong>
      <p>{state === "unconfigured" ? "Configure the server database connection to load company profiles." : "This company profile couldn’t load. Try again shortly."}</p>
    </div></div>
  </div></AppShell>;

  const offering = offerings[0] ?? null;
  const website = company.website?.startsWith("https://") ? company.website : null;

  return <AppShell active="Companies"><div className="page-wrap company-detail-wrap">
    <Link className="back-link" href="/companies"><ArrowLeft size={14} /> All companies</Link>
    <section className="company-hero"><span className="company-logo detail-logo">{company.name[0]}</span>
      <div className="company-title"><div className="eyebrow">{company.secCik ? `SEC CIK ${company.secCik}` : "IPO COMPANY"}</div><h1>{company.name}</h1>
        <p>{company.ticker ?? "Ticker not announced"}{company.industry ? <><span>·</span>{company.industry}</> : null}</p>
      </div>
      {website && <a className="button button-secondary" href={website} target="_blank" rel="noreferrer">Website <ExternalLink size={13} /></a>}
    </section>
    <div className="detail-grid"><div className="detail-main">
      <section className="panel detail-panel"><div className="panel-heading"><div><h2>Offering overview</h2><p>Confirmed details recorded for this company</p></div>
        {offering && <StatusBadge status={offering.status} />}
      </div>
        {offering ? <><div className="overview-grid">
          <div><small>EXPECTED LISTING</small><strong>{offering.expectedDate ? dateFormatter.format(offering.expectedDate) : "Not announced"}</strong></div>
          <div><small>PRICE RANGE</small><strong>{formatPriceRange(offering.priceLow, offering.priceHigh)}</strong></div>
          <div><small>DEAL SIZE</small><strong>{formatMoney(offering.dealSize)}</strong></div>
          <div><small>SHARES OFFERED</small><strong>{offering.sharesOffered ? Number(offering.sharesOffered).toLocaleString("en-US") : "Not announced"}</strong></div>
          <div><small>EXCHANGE</small><strong>{company.exchange ?? "Not announced"}</strong></div>
          <div><small>LEAD UNDERWRITERS</small><strong>{offering.leadUnderwriters?.join(", ") || "Not announced"}</strong></div>
        </div>{offering.sourceUrl ? <div className="source-attribution"><span>Source checked {offering.reviewedAt ? shortDateFormatter.format(offering.reviewedAt) : "date unavailable"}</span><a className="text-link" href={offering.sourceUrl} target="_blank" rel="noreferrer">{offering.sourceType === "sec_filing" ? "SEC filing source" : "Issuer announcement source"} <ExternalLink size={12} /></a></div> : null}</> : <div className="filing-empty"><span><FileText size={19} /></span><div><strong>No offering details recorded</strong><p>Price range and expected listing date will appear when confirmed data is added.</p></div></div>}
      </section>
      <section className="panel detail-panel"><div className="panel-heading"><div><h2>SEC filings</h2><p>Registration statements and amendments</p></div>
        {company.secCik && <a className="text-link" href={`https://www.sec.gov/edgar/browse/?CIK=${company.secCik}`} target="_blank" rel="noreferrer">Open SEC <ExternalLink size={13} /></a>}
      </div>
        {filings.length ? <div className="table-scroll"><table><thead><tr><th>FORM</th><th>FILED</th><th>ACCESSION</th><th /></tr></thead><tbody>
          {filings.map((filing) => <tr key={filing.id}><td><strong>{filing.formType}</strong></td><td>{shortDateFormatter.format(filing.filedAt)}</td><td>{filing.accessionNumber}</td><td><a className="text-link" href={filing.filingUrl} target="_blank" rel="noreferrer">View filing <ExternalLink size={12} /></a></td></tr>)}
        </tbody></table></div> : <div className="filing-empty"><span><FileText size={19} /></span><div><strong>No filings connected</strong><p>Filing records will appear after the SEC importer matches this company’s CIK.</p></div></div>}
      </section>
    </div>
    <aside className="panel snapshot-panel"><div className="panel-heading"><div><h2>Market snapshot</h2><p>Public-market trading data</p></div></div>
      <div className="snapshot-empty"><span className="snapshot-icon"><ArrowUpRight size={20} /></span><strong>Market data not connected</strong><p>Live prices and performance aren’t available yet. No market values are estimated.</p></div>
    </aside></div>
    {company.description && <section className="panel detail-panel" style={{ marginTop: 15 }}><div className="panel-heading"><div><h2>Company overview</h2><p>Company-provided or curated description</p></div></div><p style={{ margin: "0 17px 17px", color: "#747986", fontSize: 11, lineHeight: 1.6 }}>{company.description}</p></section>}
    <div className="data-note">Company and offering data reflect records stored in IPO Radar; missing values are left unreported.</div>
  </div></AppShell>;
}
