import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--field)] px-3 text-sm text-[var(--foreground)] shadow-inner outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]",
        className,
      )}
      {...props}
    />
    );
  },
);
