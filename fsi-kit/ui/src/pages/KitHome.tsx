import { ArrowRight, Briefcase, SearchCheck, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
const cards = [
  {
    to: "/compliance/watchlist",
    icon: ShieldCheck,
    eyebrow: "AML / KYC",
    title: "Compliance Intelligence",
    copy: "Screen a morning watchlist, inspect source-grounded flags, then hand off an entity for enhanced due diligence.",
  },
  {
    to: "/investment-research",
    icon: Briefcase,
    eyebrow: "Meeting preparation",
    title: "Investment Research",
    copy: "Fan out research lanes and synthesize a cited, structured brief for an upcoming meeting.",
  },
  {
    to: "/merchant-risk",
    icon: SearchCheck,
    eyebrow: "Public-web enrichment",
    title: "Merchant Risk",
    copy: "Resolve merchant identity, then surface evidence, ambiguity, coverage gaps, and next checks.",
  },
];
export default function KitHome() {
  return (
    <main className="pb-4">
      <header className="py-5 md:py-6">
        <p className="text-xs uppercase tracking-[.2em] text-tavily-green font-semibold mb-3">
          Financial Services & Insurance
        </p>
        <h1 className="font-display text-3xl md:text-[clamp(26px,3.2vw,38px)] md:whitespace-nowrap tracking-tight font-semibold text-ink-100 leading-tight">
          Evidence-first workflows, grounded in the live web
        </h1>
        <p className="text-sm text-ink-400 mt-3 max-w-3xl">
          Purpose-built modules for financial services and insurance turn current public-web
          context into reviewable work products — without hiding sources or uncertainty.
        </p>
      </header>
      <div className="grid md:grid-cols-3 gap-4">
        {cards.map(({ to, icon: Icon, eyebrow, title, copy }) => (
          <Link
            key={to}
            to={to}
            className="glass rounded-2xl p-5 min-h-[220px] flex flex-col group hover:-translate-y-1 transition-transform"
          >
            <div className="w-11 h-11 bg-white/60 rounded-xl flex items-center justify-center">
              <Icon className="w-5 h-5 text-tavily-green" />
            </div>
            <p className="text-[10px] uppercase tracking-[.16em] text-ink-500 font-semibold mt-4">
              {eyebrow}
            </p>
            <h2 className="font-display text-xl text-ink-100 font-semibold mt-2">{title}</h2>
            <p className="text-sm text-ink-400 mt-2 leading-relaxed">{copy}</p>
            <span className="text-sm font-medium text-tavily-green mt-auto pt-5 flex gap-2 items-center">
              Open module{" "}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
