import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { listings } from "@/lib/demo-data";
import { Plus, Search } from "lucide-react";

export default function CompaniesPage() {
  return <AppShell active="Companies"><div className="page-wrap"><div className="page-heading"><div><div className="eyebrow">IPO UNIVERSE</div><h1>Companies</h1><p>Explore companies preparing to enter the public markets.</p></div><button className="button button-primary"><Plus size={16} /> Add company</button></div><div className="panel companies-panel"><div className="company-toolbar"><label className="inline-search"><Search size={15} /><input aria-label="Search companies" placeholder="Search companies or tickers..." /></label><span className="result-count">{listings.length} companies</span></div><div className="table-scroll"><table><thead><tr><th>COMPANY</th><th>INDUSTRY</th><th>STATUS</th><th>EXPECTED DATE</th><th>PRICE RANGE</th><th>DEAL SIZE</th></tr></thead><tbody>{listings.map((ipo, i) => <tr key={ipo.ticker}><td><Link className="company-cell" href={`/companies/${ipo.ticker.toLowerCase()}`}><span className={`company-logo logo-${i}`}>{ipo.company[0]}</span><span><strong>{ipo.company}</strong><small>{ipo.ticker} · {ipo.exchange}</small></span></Link></td><td>{ipo.industry}</td><td><StatusBadge status={ipo.status} /></td><td>{new Date(`${ipo.expectedDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td><td>{ipo.priceRange}</td><td>{ipo.dealSize}</td></tr>)}</tbody></table></div></div><div className="data-note">Demo company profiles are illustrative and are not current market data.</div></div></AppShell>;
}
