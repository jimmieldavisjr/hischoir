"use client";

import { ArrowLeft, CalendarDays, ChevronRight, Headphones, ListMusic, LoaderCircle, LogOut, MessageSquareText, Music2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AccessDialog } from "@/components/access-dialog";
import { AppLogo } from "@/components/app-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { YouTubePlayer } from "@/components/youtube-player";
import type { ServicePlan, ServiceSummary } from "@/lib/types";

function prettyDate(value: string, short = false) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: short ? "short" : "long",
    month: short ? "short" : "long",
    day: "numeric",
    year: short ? undefined : "numeric",
  }).format(new Date(`${value}T12:00:00-07:00`));
}

export function TeamPortal({ token }: { token?: string }) {
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [service, setService] = useState<ServicePlan | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [needsAccess, setNeedsAccess] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState<Date | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(token ? `/api/service/${encodeURIComponent(token)}` : "/api/team", { cache: "no-store" });
      if (response.status === 401) {
        setNeedsAccess(true);
        return;
      }
      const payload = (await response.json()) as { services?: ServiceSummary[]; service?: ServicePlan; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load the schedule.");
      setNeedsAccess(false);
      setError("");
      if (payload.services) setServices(payload.services);
      if (payload.service) {
        setService(payload.service);
        setSelectedIndex((index) => Math.min(index, Math.max(0, payload.service!.items.length - 1)));
      }
      setUpdated(new Date());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load the schedule.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(true), 30_000);
    return () => window.clearInterval(interval);
  }, [load]);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  }

  if (loading && !needsAccess) {
    return <div className="grid min-h-screen place-items-center"><div className="text-center"><LoaderCircle className="mx-auto size-6 animate-spin text-[var(--accent-light)]" /><p className="mt-3 text-sm">Loading the service plan…</p></div></div>;
  }

  return (
    <main className="min-h-screen pb-16">
      <div className="ambient ambient-one" />
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_78%,transparent)] backdrop-blur-2xl">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center gap-3 px-4 sm:px-6">
          <AppLogo />
          <Badge className="ml-2 hidden sm:inline-flex"><Headphones className="size-3" /> Team view</Badge>
          <div className="ml-auto flex items-center gap-2">
            {updated && <span className="hidden text-[11px] text-[var(--muted-foreground)] md:block">Updates live · {updated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>}
            <Button variant="ghost" size="icon" onClick={() => load()} aria-label="Refresh"><RefreshCw className="size-4" /></Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Sign out"><LogOut className="size-4" /></Button>
          </div>
        </div>
      </header>

      {error && <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

      {token && service ? (
        <ServiceDetail service={service} selectedIndex={selectedIndex} setSelectedIndex={setSelectedIndex} />
      ) : !token ? (
        <ServiceList services={services} />
      ) : null}

      <AccessDialog role="team" open={needsAccess} onClose={() => (window.location.href = "/")} returnTo={token ? `/service/${token}` : "/team"} />
    </main>
  );
}

function ServiceList({ services }: { services: ServiceSummary[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = services.filter((service) => service.serviceDate >= today);
  const past = services.filter((service) => service.serviceDate < today).reverse();
  return (
    <div className="relative mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <Badge className="mb-6 text-emerald-300"><span className="size-1.5 rounded-full bg-emerald-300" /> Live schedule</Badge>
      <h1 className="font-display text-5xl tracking-[-.05em] sm:text-6xl">Ready for rehearsal.</h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted-foreground)]">Choose a service to hear the songs in order and review the director’s latest notes.</p>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {upcoming.map((service, index) => <ServiceCard key={service.id} service={service} featured={index === 0} />)}
      </div>
      {upcoming.length === 0 && <div className="glass-panel mt-10 rounded-[28px] p-12 text-center"><CalendarDays className="mx-auto size-7 text-[var(--muted-foreground)]" /><p className="mt-4 font-semibold">No upcoming Sabbath plans yet</p><p className="mt-1 text-sm text-[var(--muted-foreground)]">The next plan will appear here as soon as the director creates it.</p></div>}
      {past.length > 0 && <><h2 className="mt-14 text-sm font-bold uppercase tracking-[.14em] text-[var(--muted-foreground)]">Past services</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{past.slice(0, 6).map((service) => <ServiceCard key={service.id} service={service} />)}</div></>}
    </div>
  );
}

function ServiceCard({ service, featured = false }: { service: ServiceSummary; featured?: boolean }) {
  return (
    <a href={`/service/${service.shareToken}`} className={`glass-panel group relative overflow-hidden rounded-[28px] p-5 transition hover:-translate-y-0.5 hover:border-white/20 ${featured ? "md:col-span-2 md:p-7" : ""}`}>
      {featured && <div className="absolute -right-12 -top-14 size-44 rounded-full bg-[var(--accent)]/20 blur-3xl" />}
      <div className="relative flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-[20px] border border-[var(--border)] bg-[var(--glass)] text-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-light)]">{new Date(`${service.serviceDate}T12:00:00`).toLocaleDateString("en-US", { month: "short" })}</span>
          <span className="text-2xl font-bold leading-none">{new Date(`${service.serviceDate}T12:00:00`).getDate()}</span>
        </div>
        <div className="min-w-0 flex-1"><p className={`${featured ? "text-xl" : "text-base"} truncate font-bold tracking-[-.02em]`}>{service.label}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">{prettyDate(service.serviceDate, true)} · {service.itemCount} {service.itemCount === 1 ? "song" : "songs"}</p></div>
        <span className="grid size-10 place-items-center rounded-full bg-[var(--glass)] text-[var(--muted-foreground)] transition group-hover:bg-[var(--accent)] group-hover:text-white"><ChevronRight className="size-4" /></span>
      </div>
    </a>
  );
}

function ServiceDetail({ service, selectedIndex, setSelectedIndex }: { service: ServicePlan; selectedIndex: number; setSelectedIndex: (index: number) => void }) {
  return (
    <div className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <a href="/team" className="mb-7 inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"><ArrowLeft className="size-3.5" /> All services</a>
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><Badge className="mb-4 text-emerald-300"><span className="size-1.5 rounded-full bg-emerald-300" /> Live plan</Badge><h1 className="font-display text-5xl tracking-[-.05em] sm:text-6xl">{service.label}</h1><p className="mt-3 text-sm text-[var(--muted-foreground)]">{prettyDate(service.serviceDate)} · {service.items.length} {service.items.length === 1 ? "song" : "songs"}</p></div>
        <div className="flex gap-2"><Badge><ListMusic className="size-3" /> Set order</Badge><Badge><MessageSquareText className="size-3" /> Rehearsal notes</Badge></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,.9fr)]">
        <div className="glass-panel h-fit rounded-[28px] p-3 sm:p-4 lg:sticky lg:top-24"><YouTubePlayer songs={service.items} selectedIndex={selectedIndex} onSelect={setSelectedIndex} /></div>
        <div className="space-y-3">
          {service.items.map((item, index) => (
            <button key={item.itemId} className={`glass-panel w-full rounded-[24px] p-3 text-left transition hover:border-white/20 ${selectedIndex === index ? "border-[var(--accent)]/50 bg-[var(--accent-soft)]" : ""}`} onClick={() => setSelectedIndex(index)}>
              <div className="flex items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--glass)] text-xs font-bold text-[var(--accent-light)]">{index + 1}</span><img src={item.thumbnailUrl} alt="" className="h-14 w-24 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.title}</p><p className="mt-1 truncate text-[11px] text-[var(--muted-foreground)]">{item.channel} · {item.duration}</p></div></div>
              {item.notes && <div className="ml-11 mt-3 rounded-lg border border-[var(--border)] bg-black/10 p-3"><p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[var(--accent-light)]"><MessageSquareText className="size-3" /> Director note</p><p className="whitespace-pre-wrap text-xs leading-relaxed text-[var(--muted-foreground)]">{item.notes}</p></div>}
            </button>
          ))}
          {service.items.length === 0 && <div className="glass-panel grid min-h-72 place-items-center rounded-[28px] p-10 text-center"><div><Music2 className="mx-auto size-7 text-[var(--muted-foreground)]" /><p className="mt-4 font-semibold">The set is still being prepared</p><p className="mt-1 text-sm text-[var(--muted-foreground)]">Songs will appear here as the director adds them.</p></div></div>}
        </div>
      </div>
    </div>
  );
}
