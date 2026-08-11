"use client";

import {
  ArrowDown,
  ArrowUp,
  CalendarPlus,
  Check,
  ChevronDown,
  Clipboard,
  Copy,
  ExternalLink,
  GripVertical,
  Library,
  ListMusic,
  LoaderCircle,
  LogOut,
  Music2,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AppLogo } from "@/components/app-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { YouTubePlayer } from "@/components/youtube-player";
import type { PlannerPayload, ServiceItem, Song } from "@/lib/types";

type ActionBody = Record<string, unknown> & { action: string };

function prettyDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00-07:00`));
}

function plusDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function LoadingWorkspace() {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--glass)]"><LoaderCircle className="size-5 animate-spin text-[var(--accent-light)]" /></span>
        <p className="mt-4 text-sm font-semibold">Tuning the workspace…</p>
      </div>
    </div>
  );
}

export function DirectorPlanner() {
  const [data, setData] = useState<PlannerPayload | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dialog, setDialog] = useState<"create" | "edit" | "duplicate" | null>(null);
  const [formDate, setFormDate] = useState("");
  const [formLabel, setFormLabel] = useState("Sabbath Worship");
  const [dragging, setDragging] = useState<string | null>(null);

  const load = useCallback(async (serviceId?: string) => {
    setError("");
    const query = serviceId ? `?serviceId=${encodeURIComponent(serviceId)}` : "";
    const response = await fetch(`/api/planner${query}`, { cache: "no-store" });
    const payload = (await response.json()) as PlannerPayload & { error?: string };
    if (response.status === 401) {
      window.location.href = "/";
      return;
    }
    if (!response.ok) throw new Error(payload.error ?? "Unable to load the planner.");
    setData(payload);
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load the planner."));
  }, [load]);

  async function mutate(body: ActionBody, status = "Saving…") {
    setBusy(body.action);
    setMessage(status);
    setError("");
    try {
      const response = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as PlannerPayload & { error?: string };
      if (response.status === 401) {
        window.location.href = "/";
        return null;
      }
      if (!response.ok) throw new Error(payload.error ?? "The change could not be saved.");
      setData(payload);
      setSelectedIndex((index) => Math.min(index, Math.max(0, (payload.selectedService?.items.length ?? 1) - 1)));
      setMessage(body.action === "sync" ? "Playlist is up to date." : "Saved");
      window.setTimeout(() => setMessage(""), 1800);
      return payload;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The change could not be saved.");
      setMessage("");
      return null;
    } finally {
      setBusy("");
    }
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  }

  const filteredSongs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!data || !query) return data?.songs ?? [];
    return data.songs.filter((song) => `${song.title} ${song.channel}`.toLowerCase().includes(query));
  }, [data, search]);

  const plan = data?.selectedService ?? null;

  function openDialog(kind: "create" | "edit" | "duplicate") {
    setDialog(kind);
    if (kind === "create") {
      setFormDate(plan ? plusDays(plan.serviceDate, 7) : new Date().toISOString().slice(0, 10));
      setFormLabel("Sabbath Worship");
    } else if (kind === "edit" && plan) {
      setFormDate(plan.serviceDate);
      setFormLabel(plan.label);
    } else if (plan) {
      setFormDate(plusDays(plan.serviceDate, 7));
      setFormLabel(plan.label);
    }
  }

  async function submitDialog(event: FormEvent) {
    event.preventDefault();
    if (!dialog) return;
    const action = dialog === "create" ? "createService" : dialog === "edit" ? "updateService" : "duplicateService";
    const payload = await mutate({
      action,
      ...(dialog === "create" ? {} : { serviceId: plan?.id }),
      serviceDate: formDate,
      label: formLabel,
    });
    if (payload) setDialog(null);
  }

  function updateLocalNote(itemId: string, notes: string) {
    if (!data?.selectedService) return;
    setData({
      ...data,
      selectedService: {
        ...data.selectedService,
        items: data.selectedService.items.map((item) => (item.itemId === itemId ? { ...item, notes } : item)),
      },
    });
  }

  function moveItem(from: number, to: number) {
    if (!plan || to < 0 || to >= plan.items.length || from === to) return;
    const items = [...plan.items];
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    if (data) setData({ ...data, selectedService: { ...plan, items } });
    void mutate({ action: "reorder", serviceId: plan.id, itemIds: items.map((item) => item.itemId) });
    setSelectedIndex(to);
  }

  function dropOn(targetId: string) {
    if (!plan || !dragging || dragging === targetId) return;
    moveItem(
      plan.items.findIndex((item) => item.itemId === dragging),
      plan.items.findIndex((item) => item.itemId === targetId),
    );
    setDragging(null);
  }

  if (!data && !error) return <LoadingWorkspace />;

  return (
    <main className="min-h-screen">
      <div className="ambient ambient-one" />
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_78%,transparent)] backdrop-blur-2xl">
        <div className="mx-auto flex h-[72px] max-w-[1600px] items-center gap-4 px-4 sm:px-6">
          <AppLogo />
          <div className="hidden h-7 w-px bg-[var(--border)] md:block" />
          <div className="hidden min-w-0 flex-1 md:block">
            <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[var(--muted-foreground)]">Director workspace</p>
            <p className="truncate text-sm font-semibold">{plan ? `${plan.label} · ${prettyDate(plan.serviceDate)}` : "Sabbath planning"}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {message && <span className="hidden items-center gap-1.5 text-xs text-emerald-300 sm:flex"><Check className="size-3.5" />{message}</span>}
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Sign out"><LogOut className="size-4" /></Button>
          </div>
        </div>
      </header>

      {error && (
        <div className="fixed inset-x-4 top-20 z-40 mx-auto flex max-w-xl items-start gap-3 rounded-2xl border border-red-400/25 bg-red-950/85 p-4 text-sm text-red-100 shadow-2xl backdrop-blur-xl" role="alert">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error"><X className="size-4" /></button>
        </div>
      )}

      <div className="mx-auto grid max-w-[1600px] gap-4 p-4 sm:p-6 xl:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="glass-panel flex min-h-[calc(100vh-120px)] flex-col overflow-hidden rounded-[28px] xl:max-h-[calc(100vh-120px)]">
          <div className="border-b border-[var(--border)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[var(--muted-foreground)]">Song library</p>
                <p className="mt-1 text-sm font-semibold">{data?.songs.length ?? 0} playlist songs</p>
              </div>
              <Badge className={data?.configured ? "text-emerald-300" : "text-amber-300"}>
                <span className={`size-1.5 rounded-full ${data?.configured ? "bg-emerald-300" : "bg-amber-300"}`} />
                {data?.configured ? "Live sync" : "Snapshot"}
              </Badge>
            </div>
            <div className="relative mt-4">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input className="pl-10" placeholder="Search songs or channels…" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
          </div>
          <div className="thin-scrollbar flex-1 space-y-1 overflow-y-auto p-2">
            {filteredSongs.map((song) => (
              <SongLibraryRow
                key={song.id}
                song={song}
                disabled={!plan || busy === "addSong"}
                onAdd={() => plan && mutate({ action: "addSong", serviceId: plan.id, songId: song.id }, `Adding ${song.title}…`)}
              />
            ))}
            {filteredSongs.length === 0 && <p className="py-12 text-center text-sm text-[var(--muted-foreground)]">No songs match “{search}”.</p>}
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border)] p-3">
            <a className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]" href={`https://youtube.com/playlist?list=${data?.playlistId}`} target="_blank" rel="noreferrer">
              Open source playlist <ExternalLink className="size-3" />
            </a>
            <Button variant="ghost" size="sm" disabled={busy === "sync"} onClick={() => mutate({ action: "sync", serviceId: plan?.id }, "Syncing playlist…")}>
              <RefreshCw className={`size-3.5 ${busy === "sync" ? "animate-spin" : ""}`} /> Sync
            </Button>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="glass-panel rounded-[28px] p-4 sm:p-5">
            <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[var(--muted-foreground)]">Current service</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <select
                      className="h-11 appearance-none rounded-xl border border-[var(--border)] bg-[var(--field)] py-0 pl-3.5 pr-10 text-sm font-semibold outline-none focus:ring-2 focus:ring-[var(--ring)]"
                      value={plan?.id ?? ""}
                      onChange={(event) => load(event.target.value).catch((reason) => setError(String(reason)))}
                      aria-label="Choose service plan"
                    >
                      {data?.services.map((service) => <option key={service.id} value={service.id}>{service.label} · {service.serviceDate}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  </div>
                  <Button variant="secondary" size="icon" onClick={() => openDialog("create")} aria-label="Create service"><CalendarPlus className="size-4" /></Button>
                </div>
              </div>
              {plan && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => openDialog("edit")}><Settings2 className="size-3.5" /> Details</Button>
                  <Button variant="secondary" size="sm" onClick={() => openDialog("duplicate")}><Copy className="size-3.5" /> Duplicate</Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(`${window.location.origin}/service/${plan.shareToken}`);
                      setMessage("Team link copied");
                      window.setTimeout(() => setMessage(""), 1800);
                    }}
                  >
                    <Clipboard className="size-3.5" /> Share
                  </Button>
                  <Button
                    variant="danger"
                    size="iconSm"
                    aria-label="Delete service"
                    onClick={() => window.confirm("Delete this service plan and all of its notes?") && mutate({ action: "deleteService", serviceId: plan.id }, "Deleting service…")}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {plan ? (
              <div className="mt-5 grid gap-5 2xl:grid-cols-[minmax(380px,.86fr)_minmax(440px,1.14fr)]">
                <div className="min-w-0">
                  <div className="mb-4">
                    <h1 className="font-display text-3xl tracking-[-.035em] sm:text-4xl">{plan.label}</h1>
                    <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">{prettyDate(plan.serviceDate)} · {plan.items.length} {plan.items.length === 1 ? "song" : "songs"}</p>
                  </div>
                  <YouTubePlayer songs={plan.items} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
                  <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--glass)] p-4">
                    <p className="flex items-center gap-2 text-xs font-semibold"><Library className="size-3.5 text-[var(--accent-light)]" /> Team view</p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">Notes and changes appear immediately for everyone with the team passcode.</p>
                    <a className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-light)] hover:underline" href={`/service/${plan.shareToken}`} target="_blank" rel="noreferrer">Open shared service <ExternalLink className="size-3" /></a>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[var(--muted-foreground)]">Sabbath order</p>
                      <p className="mt-1 text-sm font-semibold">Drag or use arrows to reorder</p>
                    </div>
                    <Badge><ListMusic className="size-3" /> {plan.items.length} queued</Badge>
                  </div>
                  <div className="thin-scrollbar max-h-[calc(100vh-260px)] space-y-2 overflow-y-auto pr-1">
                    {plan.items.map((item, index) => (
                      <QueueItem
                        key={item.itemId}
                        item={item}
                        index={index}
                        total={plan.items.length}
                        active={index === selectedIndex}
                        dragging={dragging === item.itemId}
                        onPlay={() => setSelectedIndex(index)}
                        onDragStart={() => setDragging(item.itemId)}
                        onDrop={() => dropOn(item.itemId)}
                        onMove={(direction) => moveItem(index, index + direction)}
                        onNoteChange={(notes) => updateLocalNote(item.itemId, notes)}
                        onNoteSave={() => mutate({ action: "updateItem", serviceId: plan.id, itemId: item.itemId, notes: item.notes })}
                        onRemove={() => mutate({ action: "removeItem", serviceId: plan.id, itemId: item.itemId }, `Removing ${item.title}…`)}
                      />
                    ))}
                    {plan.items.length === 0 && (
                      <div className="grid min-h-64 place-items-center rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--glass)] p-8 text-center">
                        <div>
                          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-light)]"><Music2 className="size-5" /></span>
                          <p className="mt-4 text-sm font-semibold">Start building the set</p>
                          <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-[var(--muted-foreground)]">Choose any song from the library. It will appear here with room for a rehearsal note.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid min-h-[55vh] place-items-center text-center"><Button onClick={() => openDialog("create")}><Plus className="size-4" /> Create your first service</Button></div>
            )}
          </div>
        </section>
      </div>

      {dialog && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4 backdrop-blur-md" role="dialog" aria-modal="true">
          <form className="glass-panel relative w-full max-w-md rounded-[28px] p-6 sm:p-8" onSubmit={submitDialog}>
            <Button className="absolute right-4 top-4" variant="ghost" size="icon" type="button" onClick={() => setDialog(null)} aria-label="Close"><X className="size-4" /></Button>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--accent-light)]">{dialog === "create" ? "New plan" : dialog === "edit" ? "Service details" : "Duplicate plan"}</p>
            <h2 className="mt-2 font-display text-3xl tracking-[-.03em]">{dialog === "create" ? "Plan a service" : dialog === "edit" ? "Edit the service" : "Use this set again"}</h2>
            <div className="mt-6 space-y-4">
              <div><label className="mb-2 block text-xs font-semibold text-[var(--muted-foreground)]" htmlFor="service-date">Service date</label><Input id="service-date" type="date" value={formDate} onChange={(event) => setFormDate(event.target.value)} required /></div>
              {dialog !== "duplicate" && <div><label className="mb-2 block text-xs font-semibold text-[var(--muted-foreground)]" htmlFor="service-name">Service name</label><Input id="service-name" value={formLabel} onChange={(event) => setFormLabel(event.target.value)} maxLength={80} required /></div>}
            </div>
            <div className="mt-7 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setDialog(null)}>Cancel</Button><Button type="submit" disabled={Boolean(busy)}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : dialog === "duplicate" ? "Duplicate service" : "Save service"}</Button></div>
          </form>
        </div>
      )}
    </main>
  );
}

function SongLibraryRow({ song, disabled, onAdd }: { song: Song; disabled: boolean; onAdd: () => void }) {
  return (
    <div className="group flex items-center gap-3 rounded-2xl p-2 transition hover:bg-[var(--glass)]">
      <div className="relative shrink-0 overflow-hidden rounded-xl bg-black/20">
        <img src={song.thumbnailUrl} alt="" className="h-12 w-20 object-cover" loading="lazy" />
        <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 py-0.5 text-[9px] text-white">{song.duration}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-xs font-semibold leading-4">{song.title}</p>
        <p className="mt-1 truncate text-[10px] text-[var(--muted-foreground)]">{song.channel}</p>
      </div>
      <Button className="opacity-80 group-hover:opacity-100" variant="secondary" size="iconSm" onClick={onAdd} disabled={disabled || !song.available} aria-label={`Add ${song.title} to service`}><Plus className="size-3.5" /></Button>
    </div>
  );
}

function QueueItem({ item, index, total, active, dragging, onPlay, onDragStart, onDrop, onMove, onNoteChange, onNoteSave, onRemove }: {
  item: ServiceItem; index: number; total: number; active: boolean; dragging: boolean;
  onPlay: () => void; onDragStart: () => void; onDrop: () => void; onMove: (direction: number) => void;
  onNoteChange: (notes: string) => void; onNoteSave: () => void; onRemove: () => void;
}) {
  return (
    <article
      className={`rounded-xl border p-3 transition ${active ? "border-[var(--accent)]/50 bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--glass)] hover:bg-[var(--glass-strong)]"} ${dragging ? "opacity-45" : ""}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); onDrop(); }}
    >
      <div className="flex items-center gap-3">
        <span className="hidden cursor-grab text-[var(--muted-foreground)] sm:block"><GripVertical className="size-4" /></span>
        <button className="relative shrink-0 overflow-hidden rounded-xl text-left" onClick={onPlay} aria-label={`Play ${item.title}`}>
          <img src={item.thumbnailUrl} alt="" className="h-14 w-24 object-cover" />
          <span className="absolute inset-0 grid place-items-center bg-black/15 opacity-0 transition hover:opacity-100"><span className="grid size-7 place-items-center rounded-full bg-black/70 text-[10px] text-white">▶</span></span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-[var(--accent-light)]">{String(index + 1).padStart(2, "0")}</span><p className="truncate text-sm font-semibold">{item.title}</p></div>
          <p className="mt-1 truncate text-[11px] text-[var(--muted-foreground)]">{item.channel} · {item.duration || "YouTube"}</p>
        </div>
        <div className="flex items-center">
          <Button variant="ghost" size="iconSm" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move song up"><ArrowUp className="size-3.5" /></Button>
          <Button variant="ghost" size="iconSm" onClick={() => onMove(1)} disabled={index === total - 1} aria-label="Move song down"><ArrowDown className="size-3.5" /></Button>
          <Button variant="ghost" size="iconSm" onClick={onRemove} aria-label={`Remove ${item.title}`}><X className="size-3.5" /></Button>
        </div>
      </div>
      <Textarea
        className="mt-3 min-h-16 bg-black/10 text-xs"
        placeholder="Add a rehearsal note — entrance, dynamics, ending…"
        value={item.notes}
        onChange={(event) => onNoteChange(event.target.value)}
        onBlur={onNoteSave}
        maxLength={2000}
        aria-label={`Notes for ${item.title}`}
      />
    </article>
  );
}
