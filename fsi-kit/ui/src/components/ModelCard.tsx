import { Cpu } from "lucide-react";

interface ModelCardProps {
  provider: string;
  model: string;
}

/** Compact chip showing the active workflow model. */
export default function ModelCard({ provider, model }: ModelCardProps) {
  const shortName = model.includes("/") ? model.split("/").pop()! : model;

  return (
    <div
      className="glass rounded-lg px-2.5 py-1.5 flex items-center gap-2 max-w-[220px]"
      title={`${provider} · ${model}`}
    >
      <Cpu className="w-3.5 h-3.5 text-ink-500 shrink-0" />
      <div className="min-w-0 leading-tight">
        <p className="text-[10px] uppercase tracking-[0.14em] text-ink-500">{provider}</p>
        <p className="text-xs font-mono text-ink-200 truncate">{shortName}</p>
      </div>
    </div>
  );
}
