"use client";

import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Headphones,
  ListMusic,
  LockKeyhole,
  MessageSquareText,
  MonitorPlay,
  Music2,
  Play,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { AccessDialog } from "@/components/access-dialog";
import { AppLogo } from "@/components/app-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/types";

const setSongs = [
  { title: "Trust in God", artist: "Aware Worship", duration: "6:34", id: "FTqX59tGPD8", note: "Keys enter after intro" },
  { title: "Grateful", artist: "Hezekiah Walker", duration: "6:56", id: "2geicdMZAJM", note: "Build on final chorus" },
  { title: "Agnus Dei", artist: "Michael W. Smith", duration: "5:22", id: "QvN5jwBVR4M", note: "Soft opening, full ending" },
];

const features = [
  { icon: ListMusic, label: "Set planning", copy: "Build and reorder each Sabbath set in seconds." },
  { icon: MonitorPlay, label: "YouTube library", copy: "Listen without leaving the plan or losing your place." },
  { icon: MessageSquareText, label: "Rehearsal notes", copy: "Keep entrances, dynamics, and endings beside each song." },
  { icon: Users, label: "Live team view", copy: "Share one passcode-protected schedule that stays current." },
];

export function HomeClient() {
  const [access, setAccess] = useState<Role | null>(null);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="relative z-20 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_76%,transparent)] backdrop-blur-2xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center px-5 sm:px-8">
          <AppLogo />
          <nav className="ml-10 hidden items-center gap-7 text-xs font-medium text-[var(--muted-foreground)] md:flex" aria-label="Main navigation">
            <a href="#workspace" className="transition hover:text-[var(--foreground)]">Workspace</a>
            <a href="#features" className="transition hover:text-[var(--foreground)]">Features</a>
            <a href="https://youtube.com/playlist?list=PLMs6l5ELgAZVmvoHdbmyPhms1yPG2UApV" target="_blank" rel="noreferrer" className="transition hover:text-[var(--foreground)]">Playlist</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button variant="secondary" onClick={() => setAccess("team")}>Team view</Button>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-10 pt-16 text-center sm:px-8 sm:pt-20">
        <Badge className="border-blue-400/20 bg-blue-400/10 text-blue-300">
          <Activity className="size-3" /> Built for Sabbath worship teams
        </Badge>
        <h1 className="mx-auto mt-6 max-w-4xl text-[clamp(2.65rem,5vw,4.5rem)] font-semibold leading-[1.02] tracking-[-.06em]">
          One workspace for a<br className="hidden sm:block" /> <span className="text-gradient">prepared Sabbath.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)] sm:text-base">
          HisChoir keeps the set, playback, and rehearsal direction in sync—from the director’s first selection to the team’s final run-through.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={() => setAccess("admin")}>Open director workspace <ArrowRight className="size-4" /></Button>
          <Button size="lg" variant="secondary" onClick={() => setAccess("team")}><Headphones className="size-4" /> View Sabbath schedule</Button>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] font-medium text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1.5"><Check className="size-3 text-emerald-400" /> 29 playlist songs ready</span>
          <span className="flex items-center gap-1.5"><Check className="size-3 text-emerald-400" /> Live team updates</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="size-3 text-emerald-400" /> Protected access</span>
        </div>
      </section>

      <section id="workspace" className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-12 sm:px-8">
        <div className="glass-panel overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,.35)]">
          <div className="flex h-11 items-center border-b border-[var(--border)] px-3 sm:px-4">
            <div className="flex gap-1.5" aria-hidden="true"><span className="size-2.5 rounded-full bg-red-400/70" /><span className="size-2.5 rounded-full bg-amber-400/70" /><span className="size-2.5 rounded-full bg-emerald-400/70" /></div>
            <div className="mx-auto flex items-center gap-2 rounded-md border border-[var(--border)] bg-black/10 px-3 py-1 text-[10px] text-[var(--muted-foreground)]"><LockKeyhole className="size-2.5" /> hischoir / director</div>
            <Badge className="hidden border-emerald-400/20 text-emerald-300 sm:inline-flex"><span className="size-1.5 rounded-full bg-emerald-300" /> Saved</Badge>
          </div>

          <div className="grid min-h-[540px] lg:grid-cols-[205px_minmax(0,1fr)_300px]">
            <aside className="hidden border-r border-[var(--border)] p-3 lg:block">
              <p className="px-2 py-2 text-[9px] font-bold uppercase tracking-[.15em] text-[var(--muted-foreground)]">Sabbath plans</p>
              <div className="space-y-1">
                <div className="rounded-lg border border-blue-400/20 bg-blue-400/10 p-2.5">
                  <div className="flex items-center gap-2"><CalendarDays className="size-3.5 text-blue-300" /><span className="text-xs font-semibold">Sabbath Worship</span></div>
                  <p className="mt-1 pl-5 text-[10px] text-[var(--muted-foreground)]">Aug 15 · 3 songs</p>
                </div>
                <div className="rounded-lg p-2.5 text-[11px] text-[var(--muted-foreground)]">Aug 22 · Sabbath Worship</div>
                <div className="rounded-lg p-2.5 text-[11px] text-[var(--muted-foreground)]">Aug 29 · Sabbath Worship</div>
              </div>
              <div className="mt-6 border-t border-[var(--border)] pt-4">
                <p className="px-2 text-[9px] font-bold uppercase tracking-[.15em] text-[var(--muted-foreground)]">Source</p>
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--glass)] p-2.5"><span className="grid size-7 place-items-center rounded-md bg-red-500/15 text-red-300"><Play className="size-3 fill-current" /></span><div><p className="text-[11px] font-semibold">YouTube playlist</p><p className="text-[9px] text-emerald-300">29 synced</p></div></div>
              </div>
            </aside>

            <div className="min-w-0 p-3 sm:p-4">
              <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase tracking-[.15em] text-[var(--muted-foreground)]">Current plan</p><h2 className="mt-1 text-lg font-semibold tracking-[-.03em]">Sabbath Worship</h2><p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">Saturday, August 15 · Changes live</p></div>
                <div className="flex gap-2"><Button variant="secondary" size="sm">Share team link</Button><Button size="sm">Add song</Button></div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(260px,.82fr)_minmax(320px,1.18fr)]">
                <div>
                  <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-black/30">
                    <div className="relative aspect-video"><img src="https://i.ytimg.com/vi/FTqX59tGPD8/hqdefault.jpg" alt="Trust in God video thumbnail" className="size-full object-cover opacity-50" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" /><span className="absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/15 text-white backdrop-blur-xl"><Play className="ml-0.5 size-4 fill-current" /></span><div className="absolute inset-x-3 bottom-3"><p className="text-[9px] text-white/55">NOW REHEARSING</p><p className="mt-0.5 text-xs font-semibold text-white">Trust in God</p></div></div>
                    <div className="flex items-center justify-between border-t border-white/10 px-3 py-2 text-[10px] text-[var(--muted-foreground)]"><span>01 / 03</span><span>6:34</span></div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[{ icon: ListMusic, value: "03", label: "songs" }, { icon: MessageSquareText, value: "03", label: "notes" }, { icon: Clock3, value: "18:52", label: "runtime" }].map(({ icon: Icon, value, label }) => <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--glass)] p-2.5"><Icon className="size-3 text-[var(--accent-light)]" /><p className="mt-2 text-sm font-semibold tabular-nums">{value}</p><p className="text-[9px] text-[var(--muted-foreground)]">{label}</p></div>)}
                  </div>
                </div>

                <div>
                  <div className="relative mb-2"><Search className="absolute left-3 top-1/2 size-3 -translate-y-1/2 text-[var(--muted-foreground)]" /><div className="h-8 rounded-lg border border-[var(--border)] bg-[var(--field)] pl-8 pt-2 text-[10px] text-[var(--muted-foreground)]">Search set…</div></div>
                  <div className="space-y-1.5">
                    {setSongs.map((song, index) => (
                      <div key={song.id} className={`rounded-xl border p-2.5 ${index === 0 ? "border-blue-400/25 bg-blue-400/[.08]" : "border-[var(--border)] bg-[var(--glass)]"}`}>
                        <div className="flex items-center gap-2.5"><span className="w-4 text-[9px] font-semibold text-[var(--accent-light)]">0{index + 1}</span><img src={`https://i.ytimg.com/vi/${song.id}/mqdefault.jpg`} alt="" className="h-9 w-14 rounded-md object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold">{song.title}</p><p className="truncate text-[9px] text-[var(--muted-foreground)]">{song.artist}</p></div><span className="text-[9px] tabular-nums text-[var(--muted-foreground)]">{song.duration}</span></div>
                        <div className="ml-6 mt-2 flex items-center gap-1.5 border-t border-[var(--border)] pt-2 text-[9px] text-[var(--muted-foreground)]"><MessageSquareText className="size-2.5 text-[var(--accent-light)]" /> {song.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <aside className="hidden border-l border-[var(--border)] p-4 lg:block">
              <div className="flex items-center justify-between"><p className="text-[9px] font-bold uppercase tracking-[.15em] text-[var(--muted-foreground)]">Team readiness</p><Badge className="border-emerald-400/20 text-emerald-300">Live</Badge></div>
              <div className="mt-4 space-y-2">
                {["Set order shared", "Rehearsal notes added", "YouTube playback ready"].map((item) => <div key={item} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--glass)] p-2.5 text-[10px]"><span className="grid size-5 place-items-center rounded-md bg-emerald-400/10 text-emerald-300"><Check className="size-3" /></span>{item}</div>)}
              </div>
              <div className="mt-5 rounded-xl border border-[var(--border)] bg-black/10 p-3"><p className="text-[10px] font-semibold">Shared team view</p><p className="mt-1 text-[9px] leading-4 text-[var(--muted-foreground)]">Everyone sees the latest sequence and notes with one protected link.</p><div className="mt-3 flex -space-x-1.5">{["JD", "KM", "TS", "+4"].map((name) => <span key={name} className="grid size-7 place-items-center rounded-full border-2 border-[var(--background)] bg-[#1b222e] text-[8px] font-semibold text-white">{name}</span>)}</div></div>
              <div className="mt-4 rounded-xl border border-blue-400/15 bg-blue-400/[.06] p-3"><Music2 className="size-4 text-blue-300" /><p className="mt-2 text-[10px] font-semibold">Prepared together</p><p className="mt-1 text-[9px] leading-4 text-[var(--muted-foreground)]">One source of truth from selection to Sabbath.</p></div>
            </aside>
          </div>
        </div>
      </section>

      <section id="features" className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-20 pt-4 sm:px-8">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--accent-light)]">Core workflow</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.035em] sm:text-3xl">Every essential, already connected.</h2></div><p className="max-w-sm text-xs leading-5 text-[var(--muted-foreground)]">Less coordination overhead. More time to rehearse with intention.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, label, copy }) => <article key={label} className="glass-panel p-4"><span className="grid size-8 place-items-center rounded-lg border border-blue-400/15 bg-blue-400/[.08] text-blue-300"><Icon className="size-4" /></span><h3 className="mt-5 text-sm font-semibold">{label}</h3><p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">{copy}</p></article>)}
        </div>
      </section>

      <AccessDialog role={access ?? "team"} open={Boolean(access)} onClose={() => setAccess(null)} />
    </main>
  );
}
