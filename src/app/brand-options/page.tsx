import Link from "next/link";
import { AppShell } from "@/components/app-shell";

const options = [
  {
    number: "01",
    name: "Radar sweep",
    description: "Concentric scan rings and a single tracked signal. The clearest evolution of the current name.",
    mark: "sweep",
    tag: "MOST DIRECT",
  },
  {
    number: "02",
    name: "IPO ascent",
    description: "Rising bars paired with a subtle orbit. Signals new listings and forward momentum.",
    mark: "ascent",
    tag: "MARKET MOMENTUM",
  },
  {
    number: "03",
    name: "Radar lettermark",
    description: "A compact R built from a radar arc. Distinctive at small sizes and ready for an app icon.",
    mark: "letter",
    tag: "MOST COMPACT",
  },
];

function LogoMark({ variant, size = 42 }: { variant: string; size?: number }) {
  const common = { fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={variant + " logo mark"}>
      {variant === "sweep" && <>
        <circle cx="24" cy="24" r="18" {...common} stroke="#7357e8" strokeWidth="3.5" strokeDasharray="87 26" transform="rotate(-39 24 24)" />
        <path d="M24 24 38.5 9.5A20.5 20.5 0 0 1 44 24Z" fill="#e9e4ff" />
        <path d="M24 24 38.5 9.5" {...common} stroke="#1e9c72" strokeWidth="3" />
        <circle cx="24" cy="24" r="3.4" fill="#1e9c72" />
        <circle cx="39" cy="9.5" r="3.8" fill="#1e9c72" />
      </>}
      {variant === "ascent" && <>
        <circle cx="24" cy="24" r="18" {...common} stroke="#ddd6fb" strokeWidth="2.4" />
        <path d="M13 34v-8h6v8M22 34V19h6v15M31 34V12h6v22" fill="#7357e8" />
        <path d="m14 20 9-5 7 1 9-8" {...common} stroke="#1e9c72" strokeWidth="2.8" />
        <circle cx="39" cy="8" r="3.5" fill="#1e9c72" />
      </>}
      {variant === "letter" && <>
        <path d="M34 12a17 17 0 1 0 2 23" {...common} stroke="#7357e8" strokeWidth="4" />
        <path d="M18 35V15h11a7 7 0 0 1 0 14H18m10 0 9 8" {...common} stroke="#7357e8" strokeWidth="3.6" />
        <path d="m25 24 14-15" {...common} stroke="#1e9c72" strokeWidth="3" />
        <circle cx="39" cy="9" r="3.5" fill="#1e9c72" />
      </>}
    </svg>
  );
}

function AppIcon({ variant, tone }: { variant: string; tone: "light" | "dark" }) {
  return <div className={"brand-option-icon " + (tone === "dark" ? "brand-option-icon-dark" : "")}><LogoMark variant={variant} size={48} /></div>;
}

export default function BrandOptionsPage() {
  return (
    <AppShell active="Overview">
      <div className="page-wrap brand-options-page">
        <Link className="brand-options-back" href="/">← Back to overview</Link>
        <div className="page-heading brand-options-heading">
          <div>
            <div className="eyebrow">BRAND EXPLORATION</div>
            <h1>A new mark, same radar.</h1>
            <p>Three directions that keep the IPO Radar palette, without the heartbeat feel.</p>
          </div>
        </div>
        <div className="brand-options-grid">
          {options.map((option) => (
            <article className="brand-option-card" key={option.number}>
              <div className="brand-option-meta"><span>{option.number}</span><span className="brand-option-tag">{option.tag}</span></div>
              <div className="brand-option-showcase">
                <div className="brand-option-lockup">
                  <span className="brand-option-mark"><LogoMark variant={option.mark} /></span>
                  <span className="brand-option-wordmark">ipo<span>radar</span></span>
                </div>
              </div>
              <div className="brand-option-copy"><h2>{option.name}</h2><p>{option.description}</p></div>
              <div className="brand-option-icons">
                <div><AppIcon variant={option.mark} tone="light" /><small>Light app icon</small></div>
                <div><AppIcon variant={option.mark} tone="dark" /><small>Dark app icon</small></div>
              </div>
            </article>
          ))}
        </div>
        <div className="brand-options-note"><span>COLOR SYSTEM</span><i className="brand-swatch brand-swatch-purple" /><b>Radar purple</b><i className="brand-swatch brand-swatch-green" /><b>Signal green</b><i className="brand-swatch brand-swatch-ink" /><b>Ink</b><span className="brand-note-end">Which one feels most like IPO Radar?</span></div>
      </div>
      <style>{`
        .brand-options-page{max-width:1420px}
        .brand-options-back{display:inline-flex;margin:0 0 20px;color:#858997;font-size:11px}
        .brand-options-heading{margin-bottom:22px}
        .brand-options-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}
        .brand-option-card{min-width:0;overflow:hidden;border:1px solid #ebedf1;background:#fff;border-radius:11px}
        .brand-option-meta{height:43px;padding:0 15px;display:flex;align-items:center;justify-content:space-between;color:#9a9daa;font-size:10px;font-weight:700;letter-spacing:.8px}
        .brand-option-tag{padding:5px 7px;border-radius:5px;background:#f2efff;color:#7055db;font-size:8px;letter-spacing:.55px}
        .brand-option-showcase{height:172px;margin:0 12px;border:1px solid #eeeef3;border-radius:8px;background:linear-gradient(145deg,#fbfbfd,#f5f6fa);display:grid;place-items:center}
        .brand-option-lockup{display:flex;align-items:center;gap:9px}
        .brand-option-mark{width:51px;height:51px;display:grid;place-items:center;border-radius:13px;background:#fff;box-shadow:0 5px 16px #22232d12}
        .brand-option-wordmark{font:800 22px Manrope,sans-serif;letter-spacing:-1px;color:#24263a}
        .brand-option-wordmark span{font-weight:500;color:#8e91a0}
        .brand-option-copy{padding:16px 16px 11px}
        .brand-option-copy h2{margin:0;font:700 14px Manrope,sans-serif}
        .brand-option-copy p{min-height:44px;margin:6px 0 0;color:#858997;font-size:10px;line-height:1.6}
        .brand-option-icons{display:flex;gap:12px;padding:0 16px 17px}
        .brand-option-icons>div{display:flex;align-items:center;gap:7px;color:#9195a1;font-size:9px}
        .brand-option-icon{width:44px;height:44px;display:grid;place-items:center;border:1px solid #eeeef3;border-radius:11px;background:#fff}
        .brand-option-icon svg{width:34px;height:34px}
        .brand-option-icon-dark{border-color:#27293d;background:#24263a}
        .brand-option-icon-dark svg circle[fill=\"#1e9c72\"]{fill:#39c99a}
        .brand-option-icon-dark svg path[fill=\"#e9e4ff\"]{fill:#4c466d}
        .brand-options-note{display:flex;align-items:center;gap:8px;margin-top:15px;padding:13px 15px;border:1px solid #ebedf1;border-radius:9px;background:#fff;color:#777b88;font-size:9px}
        .brand-options-note>span:first-child{margin-right:5px;font-size:8px;font-weight:700;letter-spacing:.7px;color:#a0a3ad}
        .brand-options-note b{font-weight:500}
        .brand-swatch{width:12px;height:12px;border-radius:4px}
        .brand-swatch-purple{background:#7357e8}.brand-swatch-green{background:#1e9c72}.brand-swatch-ink{background:#24263a}
        .brand-options-note .brand-note-end{margin-left:auto;color:#7357e8;font-weight:600}
        @media(max-width:1050px){.brand-options-grid{grid-template-columns:1fr 1fr}}
        @media(max-width:700px){.brand-options-grid{grid-template-columns:1fr}.brand-option-copy p{min-height:0}.brand-options-note{flex-wrap:wrap}.brand-options-note .brand-note-end{margin-left:0;width:100%;padding-top:5px}}
      `}</style>
    </AppShell>
  );
}
