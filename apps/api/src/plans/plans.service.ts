import { Injectable } from "@nestjs/common";
import { randomUUID, randomBytes } from "node:crypto";
import type {
  PlannerPayload,
  ServiceItem,
  ServicePlan,
  ServiceSummary,
  Song,
  SyncState,
} from "../common/types";
import { DatabaseService, type Queryable } from "../database/database.service";
import { YouTubeService } from "../youtube/youtube.service";

type SongRow = {
  id: number;
  youtube_video_id: string;
  title: string;
  channel: string;
  thumbnail_url: string;
  duration: string;
  playlist_position: number;
  available: boolean;
};

type ServiceRow = {
  id: string;
  service_date: string;
  label: string;
  share_token: string;
  item_count: number;
};

type ItemRow = SongRow & {
  item_id: string;
  position: number;
  notes: string;
};

type TimestampValue = Date | string | null;

function mapSong(row: SongRow): Song {
  return {
    id: row.id,
    youtubeVideoId: row.youtube_video_id,
    title: row.title,
    channel: row.channel,
    thumbnailUrl: row.thumbnail_url,
    duration: row.duration,
    playlistPosition: row.playlist_position,
    available: row.available,
  };
}

function mapService(row: ServiceRow): ServiceSummary {
  return {
    id: row.id,
    serviceDate: row.service_date,
    label: row.label,
    shareToken: row.share_token,
    itemCount: Number(row.item_count ?? 0),
  };
}

function isoTimestamp(value: TimestampValue) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function randomToken() {
  return randomBytes(12).toString("base64url");
}

function losAngelesDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function nextSabbath() {
  const [year, month, day] = losAngelesDate().split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const offset = (6 - date.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class PlansService {
  /**
   * The one-time rebrand runs once per process rather than once per request.
   * Railway keeps this instance alive, so the cache actually holds.
   */
  private brandReady?: Promise<unknown>;

  constructor(
    private readonly database: DatabaseService,
    private readonly youtube: YouTubeService,
  ) {}

  private async prepare() {
    this.brandReady ??= this.database
      .query(
        `UPDATE services
         SET service_date = CASE
           WHEN EXTRACT(DOW FROM service_date) = 0 THEN service_date - 1
           ELSE service_date
         END,
         label = 'Sabbath Worship',
         updated_at = CURRENT_TIMESTAMP
         WHERE label = 'Sunday Worship'`,
      )
      .catch((error) => {
        this.brandReady = undefined;
        throw error;
      });
    await this.brandReady;
    await this.youtube.seedPlaylistSnapshot();
    await this.database.query(
      `INSERT INTO services (id, service_date, label, share_token)
       SELECT $1, $2, $3, $4
       WHERE NOT EXISTS (SELECT 1 FROM services)`,
      [randomUUID(), nextSabbath(), "Sabbath Worship", randomToken()],
    );
    return this.database;
  }

  private async listServicesWith(database: Queryable): Promise<ServiceSummary[]> {
    const result = await database.query<ServiceRow>(
      `SELECT s.id, s.service_date, s.label, s.share_token,
              COUNT(si.id)::integer AS item_count
       FROM services s
       LEFT JOIN service_items si ON si.service_id = s.id
       GROUP BY s.id
       ORDER BY s.service_date ASC, s.created_at ASC`,
    );
    return result.rows.map(mapService);
  }

  async listServices(): Promise<ServiceSummary[]> {
    const database = await this.prepare();
    return this.listServicesWith(database);
  }

  private async getPlanWith(
    database: Queryable,
    identifier: string,
    byToken = false,
  ): Promise<ServicePlan | null> {
    const column = byToken ? "share_token" : "id";
    const serviceResult = await database.query<ServiceRow>(
      `SELECT s.id, s.service_date, s.label, s.share_token,
              COUNT(si.id)::integer AS item_count
       FROM services s
       LEFT JOIN service_items si ON si.service_id = s.id
       WHERE s.${column} = $1
       GROUP BY s.id`,
      [identifier],
    );
    const row = serviceResult.rows[0];
    if (!row) return null;

    const itemResult = await database.query<ItemRow>(
      `SELECT si.id AS item_id, si.position, si.notes,
              so.id, so.youtube_video_id, so.title, so.channel, so.thumbnail_url,
              so.duration, so.playlist_position, so.available
       FROM service_items si
       JOIN songs so ON so.id = si.song_id
       WHERE si.service_id = $1
       ORDER BY si.position ASC, si.created_at ASC`,
      [row.id],
    );
    const items: ServiceItem[] = itemResult.rows.map((item) => ({
      ...mapSong(item),
      itemId: item.item_id,
      position: item.position,
      notes: item.notes,
    }));
    return { ...mapService(row), items };
  }

  async getServicePlan(identifier: string, byToken = false): Promise<ServicePlan | null> {
    const database = await this.prepare();
    return this.getPlanWith(database, identifier, byToken);
  }

  private async getSyncState(): Promise<SyncState> {
    const result = await this.database.query<{
      last_success_at: TimestampValue;
      last_attempt_at: TimestampValue;
      last_error: string | null;
    }>("SELECT last_success_at, last_attempt_at, last_error FROM sync_state WHERE source = 'youtube'");
    const row = result.rows[0];
    return {
      lastSuccessAt: isoTimestamp(row?.last_success_at ?? null),
      lastAttemptAt: isoTimestamp(row?.last_attempt_at ?? null),
      lastError: row?.last_error ?? null,
    };
  }

  async getPlannerPayload(serviceId?: string): Promise<PlannerPayload> {
    const database = await this.prepare();
    let sync = await this.getSyncState();
    const stale =
      !sync.lastSuccessAt || Date.now() - new Date(sync.lastSuccessAt).getTime() > 6 * 60 * 60 * 1000;
    if (this.youtube.hasKey() && stale) {
      try {
        await this.youtube.syncPlaylist();
      } catch {
        // The cached catalog remains usable and the failure is returned in sync_state.
      }
      sync = await this.getSyncState();
    }

    const [songResult, services] = await Promise.all([
      database.query<SongRow>(
        `SELECT id, youtube_video_id, title, channel, thumbnail_url, duration,
                playlist_position, available
         FROM songs
         ORDER BY available DESC, playlist_position ASC, title ASC`,
      ),
      this.listServicesWith(database),
    ]);
    const selected = services.find((service) => service.id === serviceId) ?? services[0] ?? null;
    return {
      songs: songResult.rows.map(mapSong),
      services,
      selectedService: selected ? await this.getPlanWith(database, selected.id) : null,
      sync,
      playlistId: this.youtube.playlistId,
      configured: this.youtube.hasKey(),
    };
  }

  async createService(serviceDate: string, label: string) {
    const database = await this.prepare();
    const id = randomUUID();
    await database.query(
      "INSERT INTO services (id, service_date, label, share_token) VALUES ($1, $2, $3, $4)",
      [id, serviceDate, label, randomToken()],
    );
    return this.getPlanWith(database, id);
  }

  async updateService(id: string, serviceDate: string, label: string) {
    const database = await this.prepare();
    await database.query(
      "UPDATE services SET service_date = $1, label = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3",
      [serviceDate, label, id],
    );
    return this.getPlanWith(database, id);
  }

  async deleteService(id: string) {
    const database = await this.prepare();
    await database.query("DELETE FROM services WHERE id = $1", [id]);
  }

  async duplicateService(id: string, serviceDate: string) {
    const database = await this.prepare();
    const source = await this.getPlanWith(database, id);
    if (!source) throw new Error("Service plan not found.");
    const duplicateId = randomUUID();
    await this.database.transaction(async (client) => {
      await client.query(
        "INSERT INTO services (id, service_date, label, share_token) VALUES ($1, $2, $3, $4)",
        [duplicateId, serviceDate, source.label, randomToken()],
      );
      for (const item of source.items) {
        await client.query(
          "INSERT INTO service_items (id, service_id, song_id, position, notes) VALUES ($1, $2, $3, $4, $5)",
          [randomUUID(), duplicateId, item.id, item.position, item.notes],
        );
      }
    });
    return this.getPlanWith(database, duplicateId);
  }

  async addSong(serviceId: string, songId: number) {
    const database = await this.prepare();
    await database.query(
      `INSERT INTO service_items (id, service_id, song_id, position)
       SELECT $1, $2, $3, COALESCE(MAX(position), -1) + 1
       FROM service_items
       WHERE service_id = $2`,
      [randomUUID(), serviceId, songId],
    );
    return this.getPlanWith(database, serviceId);
  }

  async updateItem(serviceId: string, itemId: string, notes: string) {
    const database = await this.prepare();
    await database.query(
      "UPDATE service_items SET notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND service_id = $3",
      [notes, itemId, serviceId],
    );
    return this.getPlanWith(database, serviceId);
  }

  async removeItem(serviceId: string, itemId: string) {
    await this.prepare();
    await this.database.transaction(async (client) => {
      await client.query("DELETE FROM service_items WHERE id = $1 AND service_id = $2", [itemId, serviceId]);
      const result = await client.query<{ id: string }>(
        "SELECT id FROM service_items WHERE service_id = $1 ORDER BY position, created_at",
        [serviceId],
      );
      for (const [position, row] of result.rows.entries()) {
        await client.query("UPDATE service_items SET position = $1 WHERE id = $2", [position, row.id]);
      }
    });
    return this.getPlanWith(this.database, serviceId);
  }

  async reorderItems(serviceId: string, itemIds: string[]) {
    await this.prepare();
    await this.database.transaction(async (client) => {
      const result = await client.query<{ id: string }>(
        "SELECT id FROM service_items WHERE service_id = $1 FOR UPDATE",
        [serviceId],
      );
      const allowed = new Set(result.rows.map((row) => row.id));
      if (itemIds.length !== allowed.size || itemIds.some((id) => !allowed.has(id))) {
        throw new Error("The service order changed. Refresh and try again.");
      }
      for (const [position, id] of itemIds.entries()) {
        await client.query(
          `UPDATE service_items
           SET position = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND service_id = $3`,
          [position, id, serviceId],
        );
      }
    });
    return this.getPlanWith(this.database, serviceId);
  }
}
