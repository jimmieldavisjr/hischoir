import { AudioLines } from "lucide-react";

export function AppLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 place-items-center rounded-lg border border-white/10 bg-[var(--accent)] text-white shadow-[0_8px_24px_rgba(10,132,255,.24)]">
        <AudioLines className="size-[17px]" />
      </span>
      {!compact && (
        <div>
          <div className="text-[15px] font-semibold tracking-[-.025em]">HisChoir</div>
          <div className="text-[10px] font-medium uppercase tracking-[.12em] text-[var(--muted-foreground)]">Sabbath worship OS</div>
        </div>
      )}
    </div>
  );
}
