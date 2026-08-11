import { ensureSchema } from "@/db";
import { playlistSnapshot, PLAYLIST_ID } from "@/lib/catalog";
import { runtimeEnv } from "@/lib/runtime";

type PlaylistItem = {
  id: string;
  snippet?: {
    title?: string;
    position?: number;
    resourceId?: { videoId?: string };
    videoOwnerChannelTitle?: string;
    thumbnails?: Record<string, { url?: string }>;
  };
  contentDetails?: { videoId?: string };
  status?: { privacyStatus?: string };
};

function isoDuration(value = "") {
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return "";
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export async function seedPlaylistSnapshot() {
  const database = await ensureSchema();
  const count = await database.prepare("SELECT COUNT(*) AS count FROM songs").first<{ count: number }>();
  if (Number(count?.count ?? 0) > 0) return;

  const statements = playlistSnapshot.map(([videoId, title, channel, duration], position) =>
    database
      .prepare(
        `INSERT INTO songs
          (youtube_video_id, playlist_item_id, title, channel, thumbnail_url, duration, playlist_position, available)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      )
      .bind(videoId, `snapshot-${videoId}`, title, channel, `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, duration, position),
  );
  statements.push(
    database
      .prepare(
        `INSERT OR IGNORE INTO sync_state (source, last_error)
         VALUES ('youtube', 'Playlist snapshot loaded. Add a YouTube API key for live syncing.')`,
      ),
  );
  await database.batch(statements);
}

export function hasYouTubeKey() {
  return Boolean(runtimeEnv().YOUTUBE_API_KEY?.trim());
}

export async function syncYouTubePlaylist() {
  const database = await ensureSchema();
  const apiKey = runtimeEnv().YOUTUBE_API_KEY?.trim();
  const attemptedAt = new Date().toISOString();
  await database
    .prepare(
      `INSERT INTO sync_state (source, last_attempt_at, last_error)
       VALUES ('youtube', ?, NULL)
       ON CONFLICT(source) DO UPDATE SET last_attempt_at = excluded.last_attempt_at, last_error = NULL`,
    )
    .bind(attemptedAt)
    .run();

  if (!apiKey) {
    const message = "A YouTube API key is needed before live syncing can run.";
    await database.prepare("UPDATE sync_state SET last_error = ? WHERE source = 'youtube'").bind(message).run();
    throw new Error(message);
  }

  try {
    const items: PlaylistItem[] = [];
    let pageToken = "";
    do {
      const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
      url.searchParams.set("part", "snippet,contentDetails,status");
      url.searchParams.set("playlistId", PLAYLIST_ID);
      url.searchParams.set("maxResults", "50");
      url.searchParams.set("key", apiKey);
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`YouTube returned ${response.status}. Check the API key and playlist access.`);
      const payload = (await response.json()) as { items?: PlaylistItem[]; nextPageToken?: string };
      items.push(...(payload.items ?? []));
      pageToken = payload.nextPageToken ?? "";
    } while (pageToken);

    const videoIds = items
      .map((item) => item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId)
      .filter((value): value is string => Boolean(value));
    const durations = new Map<string, string>();
    for (let index = 0; index < videoIds.length; index += 50) {
      const ids = videoIds.slice(index, index + 50);
      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", "contentDetails");
      url.searchParams.set("id", ids.join(","));
      url.searchParams.set("key", apiKey);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`YouTube video details returned ${response.status}.`);
      const payload = (await response.json()) as { items?: Array<{ id: string; contentDetails?: { duration?: string } }> };
      for (const video of payload.items ?? []) durations.set(video.id, isoDuration(video.contentDetails?.duration));
    }

    const now = new Date().toISOString();
    const writes = [database.prepare("UPDATE songs SET available = 0")];
    for (const item of items) {
      const videoId = item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId;
      if (!videoId || !item.snippet?.title || item.snippet.title === "Deleted video") continue;
      const thumbnails = item.snippet.thumbnails ?? {};
      const thumbnail = thumbnails.maxres?.url ?? thumbnails.standard?.url ?? thumbnails.high?.url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      const available = item.status?.privacyStatus === "private" ? 0 : 1;
      writes.push(
        database
          .prepare(
            `INSERT INTO songs
              (youtube_video_id, playlist_item_id, title, channel, thumbnail_url, duration, playlist_position, available, synced_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(youtube_video_id) DO UPDATE SET
              playlist_item_id = excluded.playlist_item_id,
              title = excluded.title,
              channel = excluded.channel,
              thumbnail_url = excluded.thumbnail_url,
              duration = excluded.duration,
              playlist_position = excluded.playlist_position,
              available = excluded.available,
              synced_at = excluded.synced_at`,
          )
          .bind(
            videoId,
            item.id,
            item.snippet.title,
            item.snippet.videoOwnerChannelTitle ?? "YouTube",
            thumbnail,
            durations.get(videoId) ?? "",
            item.snippet.position ?? 0,
            available,
            now,
          ),
      );
    }
    writes.push(
      database
        .prepare("UPDATE sync_state SET last_success_at = ?, last_attempt_at = ?, last_error = NULL WHERE source = 'youtube'")
        .bind(now, now),
    );
    await database.batch(writes);
    return { count: items.length, syncedAt: now };
  } catch (error) {
    const message = error instanceof Error ? error.message : "YouTube sync failed.";
    await database.prepare("UPDATE sync_state SET last_error = ? WHERE source = 'youtube'").bind(message).run();
    throw error;
  }
}
