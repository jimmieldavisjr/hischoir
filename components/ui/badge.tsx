import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--glass)] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[var(--muted-foreground)]",
        className,
      )}
      {...props}
    />
  );
}
