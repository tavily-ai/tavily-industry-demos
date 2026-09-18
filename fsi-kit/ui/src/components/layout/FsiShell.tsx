import { useEffect, useState } from "react";
import { Landmark, ShieldCheck } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { getApiUrl } from "../../sse";
import ModelCard from "../ModelCard";
import SetupPrompt from "../../SetupPrompt";

const modules = [
  { to: "/", label: "Home", end: true },
  { to: "/compliance", label: "Compliance Intelligence" },
  { to: "/investment-research", label: "Investment Research" },
  { to: "/merchant-risk", label: "Merchant Risk" },
];
export default function FsiShell() {
  const location = useLocation();
  const [config, setConfig] = useState<{
    provider: string;
    model: string;
    research_provider?: string;
    research_model?: string;
  } | null>(null);
  useEffect(() => {
    fetch(`${getApiUrl()}/api/config`)
      .then((r) => r.json())
      .then((data) => data?.provider && data?.model && setConfig(data))
      .catch(() => {});
  }, []);
  const researchRoute =
    location.pathname.startsWith("/investment-research") ||
    location.pathname.startsWith("/merchant-risk");
  const activeModel =
    config && location.pathname !== "/"
      ? researchRoute
        ? {
            provider: config.research_provider || "Tavily Research",
            model: config.research_model || "mini",
          }
        : { provider: config.provider, model: config.model }
      : null;
  return (
    <div
      className="min-h-screen relative isolate"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div className="landscape-background" aria-hidden="true">
        <img src="/tavily-landscape.jpg" alt="" />
        <div className="landscape-fade-top" />
        <div className="landscape-fade-bottom" />
      </div>
      <header>
        <nav className="site-nav setup-header max-w-6xl mx-auto px-6" aria-label="Main navigation">
          <a
            href="https://tavily.com"
            target="_blank"
            rel="noopener noreferrer"
            className="brand-link"
            aria-label="Tavily website"
          >
            <img
              src="/tavily-by-nebius.svg"
              alt="Tavily by Nebius"
              className="brand-logo"
              width="362"
              height="109"
            />
          </a>
          <SetupPrompt />
          <div className="nav-actions gap-2">
            {activeModel && <ModelCard provider={activeModel.provider} model={activeModel.model} />}
            <a
              href="https://github.com/tavily-ai/tavily-industry-demos/tree/main/fsi-kit"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link"
              aria-label="View on GitHub"
              title="View on GitHub"
            >
              <img src="/github-icon.png" alt="" className="github-logo" width="28" height="28" />
            </a>
          </div>
        </nav>
        <div className="max-w-6xl mx-auto px-6 pb-2">
          <nav className="flex w-full glass rounded-xl p-1 gap-1" aria-label="Kit modules">
            {modules.map((item) => (
              <NavLink
                key={item.to}
                end={item.end}
                to={item.to}
                className={({ isActive }) =>
                  `flex-1 text-center rounded-lg px-2 py-2.5 text-xs font-medium leading-tight transition-all ${isActive ? "glass-button-active text-ink-100" : "text-ink-400 hover:text-ink-100"}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-2">
        <Outlet />
        <footer className="border-t border-white/50 pt-3 pb-4 mt-6 flex justify-between gap-4 flex-wrap text-[11px] text-ink-500">
          <span className="flex gap-2 items-center">
            <ShieldCheck className="w-3.5 h-3.5" />
            Demo — Tavily. Not for production, compliance, investment, or underwriting decisions.
          </span>
          <span className="flex gap-1 items-center">
            <Landmark className="w-3.5 h-3.5" />
            Public-web intelligence with source provenance
          </span>
        </footer>
      </div>
    </div>
  );
}
