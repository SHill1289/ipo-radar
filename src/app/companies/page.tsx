import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getCompanyDirectory } from "@/lib/ipo-pages-data";
import { FileText, Search } from "lucide-react";

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const params = await searchParams;
  const search = (params.search ?? "").trim().slice(0, 100);
  const { state, companies } = await getCompanyDirectory(search);

  return <AppShell active="Companies"><div className="page-wrap">
    <div className="page-heading"><div><div className="eyebrow">IPO UNIVERSE</div><h1>Companies</h1><p>Companies identified from imported SEC registration filings.</p></div></div>
    <div className="panel companies-panel">
      <div className="company-toolbar">
        <form className="inline-search" action="/companies" method="get"><Search size={15} /><input name="search" aria-label="Search companies" placeholder="Search companies or CIK..." defaultValue={search} /><button className="text-link" type="submit">Search</button></form>
        <span className="result-count">{companies.length} {companies.length === 1 ? "company" : "companies"}</span>
      </div>
      {state === "connected" && companies.length > 0 ? <div className="table-scroll"><table><thead><tr><th>COMPANY</th><th>INDUSTRY</th><th>CIK</th><th>LATEST SEC FORM</th><th>FILED</th></tr></thead>
        <tbody>{companies.map((company) => {
          const profileSlug = company.secCik ? `cik-${company.secCik}` : company.id;
          return <tr key={company.id}>
            <td><Link className="company-cell" href={`/companies/${profileSlug}`}><span className="company-logo">{company.name[0]}</span><span><strong>{company.name}</strong><small>{company.ticker ?? "Ticker not announced"}{company.exchange ? ` · ${company.exchange}` : ""}</small></span></Link></td>
            <td>{company.industry ?? "Not classified"}</td>
            <td>{company.secCik ?? "—"}</td>
            <td>{company.latestFiling ? <a className="text-link" href={company.latestFiling.filingUrl} target="_blank" rel="noreferrer">{company.latestFiling.formType}</a> : "No linked filing"}</td>
            <td>{company.latestFiling ? dateFormatter.format(company.latestFiling.filedAt) : "—"}</td>
          </tr>;
        })}</tbody></table></div> : <div className="filing-empty"><span><FileText size={19} /></span><div>
        <strong>{state === "unconfigured" ? "Database setup needed" : state === "error" ? "Company data unavailable" : search ? "No matching companies" : "No companies tracked yet"}</strong>
        <p>{state === "unconfigured" ? "Configure the server database connection to load company records." : state === "error" ? "The company directory couldn’t load. Try again shortly." : search ? "Try another company name or CIK." : "Companies will appear here when the SEC importer finds registration filings."}</p>
      </div></div>}
    </div>
    <div className="data-note">Company records and filing links come from SEC EDGAR imports; missing offering details are not estimated.</div>
  </div></AppShell>;
}
