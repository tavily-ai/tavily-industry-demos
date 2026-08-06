import { useEffect, useState } from "react";
import { Landmark, Menu, ShieldCheck, X } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { getApiUrl } from "../../sse";
import ModelCard from "../ModelCard";

const modules = [
  { to: "/", label: "Kit home", end: true },
  { to: "/compliance", label: "Compliance" },
  { to: "/investment-research", label: "Investment Research" },
  { to: "/merchant-risk", label: "Merchant Risk" },
];
export default function FsiShell() {
  const location = useLocation();
  const [config, setConfig] = useState<{provider: string; model: string; research_provider?: string; research_model?: string} | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { fetch(`${getApiUrl()}/api/config`).then((r) => r.json()).then((data) => data?.provider && data?.model && setConfig(data)).catch(() => {}); }, []);
  const researchRoute = location.pathname.startsWith("/investment-research") || location.pathname.startsWith("/merchant-risk");
  const activeModel = config && location.pathname !== "/" ? (researchRoute ? { provider: config.research_provider || "Tavily Research", model: config.research_model || "mini" } : { provider: config.provider, model: config.model }) : null;
  return <div className="min-h-screen relative" style={{ backgroundColor: "var(--color-background)" }}>
    <div className="fixed inset-0 z-0 bg-cover bg-center" style={{backgroundImage:"url(/landscape-08.webp)",filter:"saturate(.58) brightness(1.08)",transform:"scale(1.03)"}}/>
    <div className="fixed inset-0 z-0 pointer-events-none" style={{background:"linear-gradient(180deg,rgba(255,252,246,.92),rgba(255,252,246,.62) 50%,rgba(255,252,246,.84))",backdropFilter:"blur(3px)"}}/>
    <header className="sticky top-0 z-30 border-b border-white/50 bg-white/30 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-5 py-3 flex items-center gap-5">
        <NavLink to="/" className="flex items-center gap-3 shrink-0"><img src="/tavily-full.svg" alt="Tavily" className="h-8"/><span className="hidden lg:block w-px h-7 bg-ink-500/20"/><span className="hidden lg:block"><span className="font-display font-semibold text-ink-100 block leading-tight">FSI Intelligence Kit</span><span className="text-[9px] uppercase tracking-[.2em] text-ink-500">Live-web workflows</span></span></NavLink>
        <nav className="hidden md:flex glass rounded-xl p-1 gap-1 ml-auto" aria-label="FSI modules">{modules.map((item) => <NavLink key={item.to} end={item.end} to={item.to} className={({isActive}) => `rounded-lg px-3 py-2 text-xs font-medium transition-all ${isActive ? "glass-button-active text-ink-100" : "text-ink-400 hover:text-ink-100"}`}>{item.label}</NavLink>)}</nav>
        {activeModel && <div className="hidden xl:block"><ModelCard provider={activeModel.provider} model={activeModel.model}/></div>}
        <button className="md:hidden ml-auto glass-button p-2 rounded-lg" onClick={() => setOpen(!open)} aria-label="Toggle navigation">{open ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}</button>
      </div>
      {open && <nav className="md:hidden px-5 pb-3 flex flex-col gap-1">{modules.map((item) => <NavLink key={item.to} end={item.end} onClick={() => setOpen(false)} to={item.to} className={({isActive}) => `rounded-lg px-3 py-2 text-sm ${isActive ? "glass-button-active" : "text-ink-400"}`}>{item.label}</NavLink>)}</nav>}
    </header>
    <div className="relative z-10 max-w-6xl mx-auto px-5 pt-8"><Outlet/><footer className="border-t border-white/50 pt-5 pb-8 mt-16 flex justify-between gap-4 flex-wrap text-[11px] text-ink-500"><span className="flex gap-2 items-center"><ShieldCheck className="w-3.5 h-3.5"/>Demo — Tavily. Not for production, compliance, investment, or underwriting decisions.</span><span className="flex gap-1 items-center"><Landmark className="w-3.5 h-3.5"/>Public-web intelligence with source provenance</span></footer></div>
  </div>;
}
