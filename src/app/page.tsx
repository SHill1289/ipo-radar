import { ArrowUpRight, BarChart3, CalendarDays, Clock3, FileText, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getDashboardData } from "@/lib/dashboard-data";

function formatDate(value: Date) {
  return value.toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value: Date) {
  return value.toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatIngestionSummary(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;
  const values = metadata as Record<string, unknown>;
  if (typeof values.filingsExtracted !== "number" || typeof values.extractionFailures !== "number") return null;
  const offerings = typeof values.offeringsCreatedOrUpdated === "number" ? values.offeringsCreatedOrUpdated : 0;
  return `${values.filingsExtracted} documents analyzed · ${offerings} IPO records refreshed · ${values.extractionFailures} extraction retries needed`;
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();
  const statusMessage = data.status === "unconfigured"
    ? "The dashboard is waiting for its secure database connection."
    : data.status === "error"
      ? "We couldn’t load dashboard data. The last scheduled import may still be running."
      : data.filings.length === 0
        ? "No matching registration filings have been found yet. New SEC filings will appear here after an import."
        : `${data.filings.length} most recent SEC registration filings are shown below.`;

  return <AppShell><div className="page-wrap">
    <div className="page-heading"><div><div className="eyebrow">IPO INTELLIGENCE · SEC EDGAR</div><h1>IPO filing activity</h1><p>Registration filings collected by the scheduled SEC importer.</p></div></div>
    <section className="stats-grid">
      <article className="stat-card"><div className="stat-top"><span>Filings this month</span><span className="stat-icon blue"><BarChart3 size={17} /></span></div><div className="stat-number">{data.filingCount}</div><div className="stat-foot">S-1, S-1/A, F-1 and F-1/A filings in Supabase</div></article>
      <article className="stat-card"><div className="stat-top"><span>Companies tracked</span><span className="stat-icon lavender"><FileText size={17} /></span></div><div className="stat-number">{data.companyCount}</div><div className="stat-foot">Companies identified from SEC filings</div></article>
      <article className="stat-card"><div className="stat-top"><span>Upcoming IPO dates</span><span className="stat-icon green"><CalendarDays size={17} /></span></div><div className="stat-number">{data.upcomingCount}</div><div className="stat-foot">Confirmed dates recorded in the IPO calendar</div></article>
      <article className="stat-card"><div className="stat-top"><span>Database</span><span className="stat-icon amber"><Clock3 size={17} /></span></div><div className="stat-number">{data.status === "connected" ? "Connected" : data.status === "unconfigured" ? "Setup needed" : "Unavailable"}</div><div className="stat-foot">{data.latestRun?.finishedAt ? `Last import ${formatDateTime(data.latestRun.finishedAt)}` : "No completed import recorded"}</div></article>
    </section>
    <section className="insight-banner"><span className="insight-icon"><Sparkles size={17} /></span><div><strong>Data status</strong><p>{statusMessage}</p></div></section>
    <section className="panel listings-panel">
      <div className="panel-heading"><div><h2>Latest SEC filings</h2><p>Recent registration statements, newest first.</p></div><a className="text-link" href="https://www.sec.gov/edgar/search/">Open SEC EDGAR <ArrowUpRight size={14} /></a></div>
      {data.filings.length > 0 ? <div className="table-scroll"><table><thead><tr><th>COMPANY</th><th>FORM</th><th>FILED</th><th>CIK</th><th /></tr></thead><tbody>{data.filings.map((filing, index) => { const companyName = filing.companyName ?? "Unknown company"; return <tr key={filing.id}><td><a className="company-cell" href={filing.filingUrl} target="_blank" rel="noreferrer"><span className={`company-logo logo-${index % 6}`}>{companyName[0] ?? "?"}</span><span><strong>{companyName}</strong><small>Open filing on SEC EDGAR</small></span></a></td><td><span className="status status-filed"><span className="status-dot" />{filing.formType}</span></td><td><span className="date-cell">{formatDate(filing.filedAt)}</span></td><td className="data-cell">{filing.cik}</td><td><a className="row-menu" href={filing.filingUrl} target="_blank" rel="noreferrer" aria-label={`Open ${companyName} SEC filing`}><ArrowUpRight size={16} /></a></td></tr>; })}</tbody></table></div> : <div className="filing-empty"><span><FileText size={17} /></span><div><strong>{data.status === "connected" ? "No recent filings" : "Live filing data isn’t available yet"}</strong><p>{data.status === "connected" ? "The database is connected. The importer will add records when it finds matching filings." : "Once the database connection is configured, this dashboard will load filings directly from Supabase."}</p></div></div>}
      <div className="panel-footer"><span>Showing <b>{data.filings.length}</b> recent filings</span><span>{data.latestRun ? `Last import: ${data.latestRun.recordsRead} filings read${formatIngestionSummary(data.latestRun.metadata) ? ` · ${formatIngestionSummary(data.latestRun.metadata)}` : ""}` : "Waiting for first import"}</span></div>
    </section>
    <div className="data-note"><Clock3 size={13} /> Filing data is sourced from SEC EDGAR. Upcoming dates are shown only when entered in the database.</div>
  </div></AppShell>;
}
