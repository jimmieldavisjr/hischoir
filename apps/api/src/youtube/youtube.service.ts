import { Inject, Injectable } from "@nestjs/common";
import { APP_ENV, type AppEnv } from "../config/env";
import { DatabaseService } from "../database/database.service";
import { PLAYLIST_ID, playlistSnapshot } from "./catalog";

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

@Injectable()
export class YouTubeService {
  readonly playlistId = PLAYLIST_ID;

  constructor(
    private readonly database: DatabaseService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  hasKey() {
    return Boolean(this.env.youtubeApiKey);
  }

  async seedPlaylistSnapshot() {
    const countResult = await this.database.query<{ count: number }>(
      "SELECT COUNT(*)::integer AS count FROM songs",
    );
    if (Number(countResult.rows[0]?.count ?? 0) > 0) return;

    await this.database.transaction(async (client) => {
      for (const [position, [videoId, title, channel, duration]] of playlistSnapshot.entries()) {
        await client.query(
          `INSERT INTO songs
            (youtube_video_id, playlist_item_id, title, channel, thumbnail_url, duration, playlist_position, available)
           VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
           ON CONFLICT (youtube_video_id) DO NOTHING`,
          [
            videoId,
            `snapshot-${videoId}`,
            title,
            channel,
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            duration,
            position,
          ],
        );
      }
      await client.query(
        `INSERT INTO sync_state (source, last_error)
         VALUES ('youtube', 'Playlist snapshot loaded. Add a YouTube API key for live syncing.')
         ON CONFLICT (source) DO NOTHING`,
      );
    });
  }

  async syncPlaylist() {
    const apiKey = this.env.youtubeApiKey;
    const attemptedAt = new Date().toISOString();
    await this.database.query(
      `INSERT INTO sync_state (source, last_attempt_at, last_error)
       VALUES ('youtube', $1, NULL)
       ON CONFLICT (source) DO UPDATE
         SET last_attempt_at = EXCLUDED.last_attempt_at, last_error = NULL`,
      [attemptedAt],
    );

    if (!apiKey) {
      const message = "A YouTube API key is needed before live syncing can run.";
      await this.database.query("UPDATE sync_state SET last_error = $1 WHERE source = 'youtube'", [message]);
      throw new Error(message);
    }

    try {
      const items = await this.fetchPlaylistItems(apiKey);
      const durations = await this.fetchDurations(apiKey, items);
      const now = new Date().toISOString();

      await this.database.transaction(async (client) => {
        await client.query("UPDATE songs SET available = FALSE");
        for (const item of items) {
          const videoId = item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId;
          if (!videoId || !item.snippet?.title || item.snippet.title === "Deleted video") continue;
          const thumbnails = item.snippet.thumbnails ?? {};
          const thumbnail =
            thumbnails.maxres?.url ??
            thumbnails.standard?.url ??
            thumbnails.high?.url ??
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
          await client.query(
            `INSERT INTO songs
              (youtube_video_id, playlist_item_id, title, channel, thumbnail_url, duration,
               playlist_position, available, synced_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (youtube_video_id) DO UPDATE SET
               playlist_item_id = EXCLUDED.playlist_item_id,
               title = EXCLUDED.title,
               channel = EXCLUDED.channel,
               thumbnail_url = EXCLUDED.thumbnail_url,
               duration = EXCLUDED.duration,
               playlist_position = EXCLUDED.playlist_position,
               available = EXCLUDED.available,
               synced_at = EXCLUDED.synced_at`,
            [
              videoId,
              item.id,
              item.snippet.title,
              item.snippet.videoOwnerChannelTitle ?? "YouTube",
              thumbnail,
              durations.get(videoId) ?? "",
              item.snippet.position ?? 0,
              item.status?.privacyStatus !== "private",
              now,
            ],
          );
        }
        await client.query(
          `UPDATE sync_state
           SET last_success_at = $1, last_attempt_at = $1, last_error = NULL
           WHERE source = 'youtube'`,
          [now],
        );
      });
      return { count: items.length, syncedAt: now };
    } catch (error) {
      const message = error instanceof Error ? error.message : "YouTube sync failed.";
      await this.database.query("UPDATE sync_state SET last_error = $1 WHERE source = 'youtube'", [message]);
      throw error;
    }
  }

  private async fetchPlaylistItems(apiKey: string) {
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
      if (!response.ok) {
        throw new Error(`YouTube returned ${response.status}. Check the API key and playlist access.`);
      }
      const payload = (await response.json()) as { items?: PlaylistItem[]; nextPageToken?: string };
      items.push(...(payload.items ?? []));
      pageToken = payload.nextPageToken ?? "";
    } while (pageToken);
    return items;
  }

  private async fetchDurations(apiKey: string, items: PlaylistItem[]) {
    const videoIds = items
      .map((item) => item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId)
      .filter((value): value is string => Boolean(value));
    const durations = new Map<string, string>();

    for (let index = 0; index < videoIds.length; index += 50) {
      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", "contentDetails");
      url.searchParams.set("id", videoIds.slice(index, index + 50).join(","));
      url.searchParams.set("key", apiKey);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`YouTube video details returned ${response.status}.`);
      const payload = (await response.json()) as {
        items?: Array<{ id: string; contentDetails?: { duration?: string } }>;
      };
      for (const video of payload.items ?? []) {
        durations.set(video.id, isoDuration(video.contentDetails?.duration));
      }
    }
    return durations;
  }
}
