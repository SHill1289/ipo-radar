import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getCalendarOfferings } from "@/lib/ipo-pages-data";
import { CalendarDays, ChevronLeft, ChevronRight, FileText } from "lucide-react";

const weekdayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

function formatMoney(value: string | null) {
  if (value === null) return "Not announced";
  const amount = Number(value);
  return Number.isFinite(amount) ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount) : "Not announced";
}

function formatPriceRange(low: string | null, high: string | null) {
  if (low && high && low !== high) return `${formatMoney(low)}–${formatMoney(high)}`;
  return formatMoney(low ?? high);
}

function companyProfilePath(companyId: string, secCik: string | null) {\n  return `/companies/${secCik ? `cik-${secCik}` : companyId}`;\n}\n\nfunction monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const params = await searchParams;
  const requestedMonth = /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month as string : "";
  const [yearValue, monthValue] = requestedMonth ? requestedMonth.split("-").map(Number) : [new Date().getUTCFullYear(), new Date().getUTCMonth() + 1];
  const validMonth = monthValue >= 1 && monthValue <= 12 && yearValue >= 2000 && yearValue <= 2100;
  const year = validMonth ? yearValue : new Date().getUTCFullYear();
  const monthIndex = validMonth ? monthValue - 1 : new Date().getUTCMonth();
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));
  const { state, offerings } = await getCalendarOfferings(start, end);
  const offset = (start.getUTCDay() + 6) % 7;
  const dayCount = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cellCount = Math.ceil((offset + dayCount) / 7) * 7;
  const gridStart = new Date(Date.UTC(year, monthIndex, 1 - offset));
  const eventsByDay = new Map<string, typeof offerings>();
  for (const offering of offerings) {
    const key = offering.expectedDate.toISOString().slice(0, 10);
    eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), offering]);
  }
  const previous = monthKey(new Date(Date.UTC(year, monthIndex - 1, 1)));
  const next = monthKey(new Date(Date.UTC(year, monthIndex + 1, 1)));
  const todayKey = new Date().toISOString().slice(0, 10);

  return <AppShell active="IPO calendar"><div className="page-wrap">
    <div className="page-heading"><div><div className="eyebrow">PIPELINE TRACKER</div><h1>IPO calendar</h1><p>Expected listing dates recorded in the database.</p></div></div>
    <div className="calendar-toolbar">
      <Link className="button button-secondary" href={`/calendar?month=${previous}`}><ChevronLeft size={15} /> Previous</Link>
      <h2>{monthFormatter.format(start)}</h2>
      <Link className="button button-secondary" href={`/calendar?month=${next}`}>Next <ChevronRight size={15} /></Link>
      <span className="toolbar-spacer" />
      <span className="result-count">{offerings.length} dated offerings</span>
    </div>
    {state !== "connected" && <div className="panel filing-empty"><span><FileText size={19} /></span><div><strong>{state === "unconfigured" ? "Database setup needed" : "Calendar data unavailable"}</strong><p>{state === "unconfigured" ? "Configure the server database connection to load IPO dates." : "The calendar couldn’t load its data. Try again shortly."}</p></div></div>}
    <div className="calendar-board">
      <div className="calendar-headings">{weekdayLabels.map((day) => <span key={day}>{day}</span>)}</div>
      <div className="calendar-cells">{Array.from({ length: cellCount }, (_, index) => {
        const date = new Date(gridStart.getTime() + index * 86400000);
        const dateKey = date.toISOString().slice(0, 10);
        const inMonth = date.getUTCMonth() === monthIndex;
        const dayEvents = eventsByDay.get(dateKey) ?? [];
        return <div className={`calendar-cell ${!inMonth ? "out-month" : ""} ${dateKey === todayKey ? "selected-day" : ""}`} key={dateKey}>
          <span>{date.getUTCDate()}</span>
          {dayEvents.map((event) => <Link className="calendar-event" href={companyProfilePath(event.companyId, event.secCik)} key={event.id}>
            <i />{event.companyName}{event.ticker ? ` · ${event.ticker}` : ""}
          </Link>)}
        </div>;
      })}</div>
    </div>
    <section className="panel calendar-list">
      <div className="panel-heading"><div><h2>Expected listings</h2><p>Offerings with dates recorded for {monthFormatter.format(start)}.</p></div><CalendarDays size={17} color="#9296a2" /></div>
      <div className="table-scroll"><table><thead><tr><th>COMPANY</th><th>STATUS</th><th>EXPECTED DATE</th><th>PRICE RANGE</th><th>DEAL SIZE</th></tr></thead>
        <tbody>{offerings.length ? offerings.map((offering) => <tr key={offering.id}>
          <td><Link className="company-cell" href={companyProfilePath(offering.companyId, offering.secCik)}><span className="company-logo">{offering.companyName[0]}</span><span><strong>{offering.companyName}</strong><small>{offering.ticker ?? "Ticker not announced"}</small></span></Link></td>
          <td><StatusBadge status={offering.status} /></td><td>{dateFormatter.format(offering.expectedDate)}</td>
          <td>{formatPriceRange(offering.priceLow, offering.priceHigh)}</td><td>{formatMoney(offering.dealSize)}</td>
        </tr>) : <tr><td colSpan={5}>{state === "connected" ? "No expected listing dates are recorded for this month." : "No offering data available."}</td></tr>}</tbody>
      </table></div>
    </section>
    <div className="data-note">Expected dates and offering details are shown only when recorded in the database.</div>
  </div></AppShell>;
}
