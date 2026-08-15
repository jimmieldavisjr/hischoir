"use client";

import { ArrowRight, KeyRound, LoaderCircle, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import type { Role } from "@/lib/types";

export function AccessDialog({ role, open, onClose, returnTo }: { role: Role; open: boolean; onClose: () => void; returnTo?: string }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiFetch("/api/auth", { method: "POST", body: { role, passcode } });
      window.location.href = returnTo ?? (role === "admin" ? "/director" : "/team");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to continue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="access-title">
      <div className="glass-panel relative w-full max-w-md rounded-[28px] p-6 shadow-2xl sm:p-8">
        <Button className="absolute right-4 top-4" variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog">
          <X className="size-4" />
        </Button>
        <span className="mb-5 grid size-12 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-light)]">
          <KeyRound className="size-5" />
        </span>
        <h2 id="access-title" className="font-display text-3xl tracking-[-.03em]">
          {role === "admin" ? "Director access" : "Team access"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
          {role === "admin"
            ? "Enter the director passcode to build and update service plans."
            : "Enter the shared rehearsal passcode to view upcoming set lists."}
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-[var(--muted-foreground)]" htmlFor="passcode">
              Passcode
            </label>
            <Input ref={inputRef} id="passcode" type="password" autoComplete="current-password" value={passcode} onChange={(event) => setPasscode(event.target.value)} required />
          </div>
          {error && <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">{error}</p>}
          <Button className="w-full" size="lg" type="submit" disabled={busy}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <>Continue <ArrowRight className="size-4" /></>}
          </Button>
        </form>
      </div>
    </div>
  );
}
