"use client";

import { ExternalLink, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ServiceItem, Song } from "@/lib/types";

type Playable = Song | ServiceItem;

export function YouTubePlayer({
  songs,
  selectedIndex,
  onSelect,
  compact = false,
}: {
  songs: Playable[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  compact?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const selected = songs[selectedIndex];

  if (!selected) {
    return (
      <div className="grid aspect-video place-items-center rounded-xl border border-dashed border-[var(--border)] bg-black/15 p-8 text-center">
        <div>
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--glass)] text-[var(--muted-foreground)]"><Play className="size-5" /></span>
          <p className="mt-4 text-sm font-semibold">Your service player is ready</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Add a song to the set to begin listening.</p>
        </div>
      </div>
    );
  }

  function choose(index: number) {
    onSelect(index);
    setPlaying(true);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-black/25 shadow-xl">
      <div className="relative aspect-video bg-[#101117]">
        {playing && selected.available ? (
          <iframe
            key={selected.youtubeVideoId}
            className="absolute inset-0 size-full"
            src={`https://www.youtube-nocookie.com/embed/${selected.youtubeVideoId}?autoplay=1&playsinline=1&rel=0`}
            title={`Play ${selected.title}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <>
            <img src={selected.thumbnailUrl} alt="" className="size-full object-cover opacity-55" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
            <button
              className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/15 text-white shadow-2xl backdrop-blur-xl transition hover:scale-105 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-45"
              onClick={() => setPlaying(true)}
              disabled={!selected.available}
              aria-label={`Play ${selected.title}`}
            >
              <Play className="ml-1 size-6 fill-current" />
            </button>
            <div className="absolute inset-x-5 bottom-4 flex items-end justify-between gap-4 text-white">
              <div className="min-w-0">
                <p className="truncate text-xs text-white/60">{selected.channel}</p>
                <p className="mt-1 truncate font-semibold">{selected.title}</p>
              </div>
              {!selected.available && <Badge className="border-red-300/20 bg-red-500/20 text-red-100">Unavailable</Badge>}
            </div>
          </>
        )}
      </div>
      <div className={`flex items-center gap-2 border-t border-white/10 ${compact ? "p-2" : "p-3"}`}>
        <Button variant="ghost" size="iconSm" onClick={() => choose(Math.max(0, selectedIndex - 1))} disabled={selectedIndex === 0} aria-label="Previous song">
          <SkipBack className="size-4" />
        </Button>
        <Button variant="secondary" size="iconSm" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Close player" : "Play song"}>
          {playing ? <Pause className="size-4" /> : <Play className="size-4 fill-current" />}
        </Button>
        <Button variant="ghost" size="iconSm" onClick={() => choose(Math.min(songs.length - 1, selectedIndex + 1))} disabled={selectedIndex === songs.length - 1} aria-label="Next song">
          <SkipForward className="size-4" />
        </Button>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-xs font-semibold">{selected.title}</p>
          <p className="text-[11px] text-[var(--muted-foreground)]">{selectedIndex + 1} of {songs.length} · {selected.duration || "YouTube"}</p>
        </div>
        <a className="grid size-8 place-items-center rounded-lg text-[var(--muted-foreground)] transition hover:bg-[var(--glass)] hover:text-[var(--foreground)]" href={`https://youtu.be/${selected.youtubeVideoId}`} target="_blank" rel="noreferrer" aria-label="Open on YouTube">
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  );
}
