import Image from "next/image";
import Link from "next/link";
import { Activity, CalendarDays, ChevronDown, CircleHelp, Command, FileText, LayoutDashboard, Search, Settings2, ShieldCheck } from "lucide-react";

const nav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/calendar", label: "IPO calendar", icon: CalendarDays },
  { href: "/companies", label: "Companies", icon: Activity },
  { href: "/review", label: "Review IPO details", icon: ShieldCheck },
];

export function AppShell({ children, active = "Overview" }: { children: React.ReactNode; active?: string }) {
  return <div className="app-frame">
    <aside className="sidebar">
      <Link className="brand" href="/" aria-label="IPO Radar home">
        <Image className="ipo-radar-full-logo" src="/ipo-radar-logo.png" alt="IPO Radar" width={403} height={181} priority />
        <span className="ipo-radar-compact" aria-hidden="true"><Image src="/ipo-radar-mark.png" alt="" width={164} height={152} priority /></span>
      </Link>
      <div className="workspace-switch"><span className="workspace-avatar">A</span><span className="workspace-copy"><strong>Personal workspace</strong><small>Free plan</small></span><ChevronDown size={15} /></div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="side-nav">{nav.map(({ href, label, icon: Icon }) => <Link className={active === label ? "nav-item active" : "nav-item"} href={href} key={href}><Icon size={17} />{label}</Link>)}</nav>
      <div className="sidebar-bottom"><Link href="/settings" className="nav-item"><Settings2 size={17} />Settings</Link><Link href="/help" className="nav-item"><CircleHelp size={17} />Help & feedback</Link><div className="profile-card"><span className="profile-avatar">AH</span><span className="workspace-copy"><strong>Alex Hill</strong><small>Personal account</small></span><button aria-label="Account options">···</button></div></div>
    </aside>
    <main className="main-area"><header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{active}</strong></div><div className="topbar-actions"><button className="search-trigger"><Search size={15} />Search IPOs...<kbd><Command size={10} /> K</kbd></button><button className="icon-button" aria-label="Recent filings"><FileText size={17} /><i /></button><span className="topbar-divider" /><span className="market-indicator"><i /> Market open</span></div></header>{children}</main>
    <style>{`
      .sidebar .brand{display:block;height:auto;padding:0;margin:0 0 20px;box-sizing:border-box}
      .ipo-radar-full-logo{display:block;width:100%;height:auto;max-width:100%;border-radius:0}
      .ipo-radar-compact{display:none}
      @media(max-width:850px){
        .sidebar .brand{width:48px;height:48px;padding:0;margin:0 0 25px}
        .ipo-radar-full-logo{display:none}
        .ipo-radar-compact{display:grid;width:48px;height:48px;place-items:center;overflow:hidden}
        .ipo-radar-compact img{position:static;width:48px;height:auto;max-width:100%}
      }
    `}</style>
  </div>;
}
