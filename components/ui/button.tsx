import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-45 active:scale-[.98]",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent)] text-white shadow-[0_8px_24px_rgba(10,132,255,.2)] hover:bg-[var(--accent-strong)]",
        secondary: "border border-[var(--border)] bg-[var(--glass-strong)] text-[var(--foreground)] shadow-sm hover:bg-[var(--glass-hover)]",
        ghost: "text-[var(--muted-foreground)] hover:bg-[var(--glass)] hover:text-[var(--foreground)]",
        danger: "border border-red-400/20 bg-red-500/10 text-red-300 hover:bg-red-500/20",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-5",
        icon: "size-10 p-0",
        iconSm: "size-8 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
