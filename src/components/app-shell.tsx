import Link from "next/link";
import { Activity, CalendarDays, ChevronDown, CircleHelp, Command, FileText, LayoutDashboard, Search, Settings2 } from "lucide-react";

const nav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/calendar", label: "IPO calendar", icon: CalendarDays },
  { href: "/companies", label: "Companies", icon: Activity },
];

function IpoRadarMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="20" fill="none" stroke="white" strokeWidth="2.5" />
      <path d="M11.5 29A14.5 14.5 0 0 1 34 13" fill="none" stroke="#08cfa3" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M24 24 37.5 10.5" fill="none" stroke="#08cfa3" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="24" r="2.8" fill="#08cfa3" />
      <circle cx="38" cy="10" r="3.5" fill="#08cfa3" />
      <path d="M14 38V30h4v8m3 0V25h4v13m3 0V21h4v17" fill="white" />
    </svg>
  );
}

export function AppShell({ children, active = "Overview" }: { children: React.ReactNode; active?: string }) {
  return <div className="app-frame">
    <aside className="sidebar">
      <Link className="brand" href="/" aria-label="IPO Radar home">
        <span className="ipo-radar-icon"><IpoRadarMark /></span>
        <span className="ipo-radar-wordmark"><strong>IPO</strong><span>RADAR</span></span>
      </Link>
      <div className="workspace-switch"><span className="workspace-avatar">A</span><span className="workspace-copy"><strong>Personal workspace</strong><small>Free plan</small></span><ChevronDown size={15} /></div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="side-nav">{nav.map(({ href, label, icon: Icon }) => <Link className={active === label ? "nav-item active" : "nav-item"} href={href} key={href}><Icon size={17} />{label}{label === "IPO calendar" && <span className="nav-count">12</span>}</Link>)}</nav>
      <div className="nav-label watch-label">YOUR WATCHLIST <button aria-label="Add watchlist item">+</button></div>
      <div className="watchlist"><Link href="/companies/nsta"><span className="ticker-dot purple">N</span><span>Northstar AI</span><span className="watch-change">+6.8%</span></Link><Link href="/companies/atlr"><span className="ticker-dot slate">A</span><span>Atlas Robotics</span><span className="watch-change muted">—</span></Link><Link href="/companies/mosh"><span className="ticker-dot teal">M</span><span>Mosaic Health</span><span className="watch-change">+2.1%</span></Link></div>
      <div className="sidebar-bottom"><Link href="/settings" className="nav-item"><Settings2 size={17} />Settings</Link><Link href="/help" className="nav-item"><CircleHelp size={17} />Help & feedback</Link><div className="profile-card"><span className="profile-avatar">AH</span><span className="workspace-copy"><strong>Alex Hill</strong><small>Personal account</small></span><button aria-label="Account options">···</button></div></div>
    </aside>
    <main className="main-area"><header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{active}</strong></div><div className="topbar-actions"><button className="search-trigger"><Search size={15} />Search IPOs...<kbd><Command size={10} /> K</kbd></button><button className="icon-button" aria-label="Recent filings"><FileText size={17} /><i /></button><span className="topbar-divider" /><span className="market-indicator"><i /> Market open</span></div></header>{children}</main>
    <style>{`
      .sidebar .brand{height:48px;gap:10px;padding:0 7px 24px;box-sizing:content-box;align-items:center}
      .ipo-radar-icon{width:42px;height:42px;flex:none;padding:3px;display:grid;place-items:center;border-radius:12px;background:#071b2f}
      .ipo-radar-icon svg{display:block;width:100%;height:100%}
      .ipo-radar-wordmark{display:flex;flex-direction:column;gap:0;color:#071b2f;line-height:.8}
      .ipo-radar-wordmark strong{font:800 20px/.85 Manrope,sans-serif;letter-spacing:-.6px}
      .ipo-radar-wordmark span{margin:1px 0 0;color:#747987;font:600 10px/1 Manrope,sans-serif;letter-spacing:2.3px}
      @media(max-width:850px){.sidebar .brand{padding:0 10px 25px}.ipo-radar-wordmark{display:none}}
    `}</style>
  </div>;
}
