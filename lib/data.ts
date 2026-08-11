import { getDatabase, type Queryable, withTransaction } from "@/db";
import { PLAYLIST_ID } from "@/lib/catalog";
import type { PlannerPayload, ServiceItem, ServicePlan, ServiceSummary, Song, SyncState } from "@/lib/types";
import { hasYouTubeKey, seedPlaylistSnapshot, syncYouTubePlaylist } from "@/lib/youtube";

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

let brandReady: Promise<unknown> | undefined;

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
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
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

export async function prepareAppData() {
  const database = getDatabase();
  brandReady ??= database
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
      brandReady = undefined;
      throw error;
    });
  await brandReady;
  await seedPlaylistSnapshot();
  await database.query(
    `INSERT INTO services (id, service_date, label, share_token)
     SELECT $1, $2, $3, $4
     WHERE NOT EXISTS (SELECT 1 FROM services)`,
    [crypto.randomUUID(), nextSabbath(), "Sabbath Worship", randomToken()],
  );
  return database;
}

async function listServicesWith(database: Queryable): Promise<ServiceSummary[]> {
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

export async function listServices(): Promise<ServiceSummary[]> {
  const database = await prepareAppData();
  return listServicesWith(database);
}

async function getServicePlanWith(
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

export async function getServicePlan(identifier: string, byToken = false): Promise<ServicePlan | null> {
  const database = await prepareAppData();
  return getServicePlanWith(database, identifier, byToken);
}

async function getSyncState(): Promise<SyncState> {
  const result = await getDatabase().query<{
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

export async function getPlannerPayload(serviceId?: string): Promise<PlannerPayload> {
  const database = await prepareAppData();
  let sync = await getSyncState();
  const stale = !sync.lastSuccessAt || Date.now() - new Date(sync.lastSuccessAt).getTime() > 6 * 60 * 60 * 1000;
  if (hasYouTubeKey() && stale) {
    try {
      await syncYouTubePlaylist();
    } catch {
      // The cached catalog remains usable and the failure is returned in sync_state.
    }
    sync = await getSyncState();
  }

  const [songResult, services] = await Promise.all([
    database.query<SongRow>(
      `SELECT id, youtube_video_id, title, channel, thumbnail_url, duration,
              playlist_position, available
       FROM songs
       ORDER BY available DESC, playlist_position ASC, title ASC`,
    ),
    listServicesWith(database),
  ]);
  const selected = services.find((service) => service.id === serviceId) ?? services[0] ?? null;
  return {
    songs: songResult.rows.map(mapSong),
    services,
    selectedService: selected ? await getServicePlanWith(database, selected.id) : null,
    sync,
    playlistId: PLAYLIST_ID,
    configured: hasYouTubeKey(),
  };
}

export async function createService(serviceDate: string, label: string) {
  const database = await prepareAppData();
  const id = crypto.randomUUID();
  await database.query(
    "INSERT INTO services (id, service_date, label, share_token) VALUES ($1, $2, $3, $4)",
    [id, serviceDate, label, randomToken()],
  );
  return getServicePlanWith(database, id);
}

export async function updateService(id: string, serviceDate: string, label: string) {
  const database = await prepareAppData();
  await database.query(
    "UPDATE services SET service_date = $1, label = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3",
    [serviceDate, label, id],
  );
  return getServicePlanWith(database, id);
}

export async function deleteService(id: string) {
  const database = await prepareAppData();
  await database.query("DELETE FROM services WHERE id = $1", [id]);
}

export async function duplicateService(id: string, serviceDate: string) {
  const database = await prepareAppData();
  const source = await getServicePlanWith(database, id);
  if (!source) throw new Error("Service plan not found.");
  const duplicateId = crypto.randomUUID();
  await withTransaction(async (client) => {
    await client.query(
      "INSERT INTO services (id, service_date, label, share_token) VALUES ($1, $2, $3, $4)",
      [duplicateId, serviceDate, source.label, randomToken()],
    );
    for (const item of source.items) {
      await client.query(
        "INSERT INTO service_items (id, service_id, song_id, position, notes) VALUES ($1, $2, $3, $4, $5)",
        [crypto.randomUUID(), duplicateId, item.id, item.position, item.notes],
      );
    }
  });
  return getServicePlanWith(database, duplicateId);
}

export async function addSong(serviceId: string, songId: number) {
  const database = await prepareAppData();
  await database.query(
    `INSERT INTO service_items (id, service_id, song_id, position)
     SELECT $1, $2, $3, COALESCE(MAX(position), -1) + 1
     FROM service_items
     WHERE service_id = $2`,
    [crypto.randomUUID(), serviceId, songId],
  );
  return getServicePlanWith(database, serviceId);
}

export async function updateItem(serviceId: string, itemId: string, notes: string) {
  const database = await prepareAppData();
  await database.query(
    "UPDATE service_items SET notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND service_id = $3",
    [notes, itemId, serviceId],
  );
  return getServicePlanWith(database, serviceId);
}

export async function removeItem(serviceId: string, itemId: string) {
  await prepareAppData();
  await withTransaction(async (database) => {
    await database.query("DELETE FROM service_items WHERE id = $1 AND service_id = $2", [itemId, serviceId]);
    const result = await database.query<{ id: string }>(
      "SELECT id FROM service_items WHERE service_id = $1 ORDER BY position, created_at",
      [serviceId],
    );
    for (const [position, row] of result.rows.entries()) {
      await database.query("UPDATE service_items SET position = $1 WHERE id = $2", [position, row.id]);
    }
  });
  return getServicePlanWith(getDatabase(), serviceId);
}

export async function reorderItems(serviceId: string, itemIds: string[]) {
  await prepareAppData();
  await withTransaction(async (database) => {
    const result = await database.query<{ id: string }>(
      "SELECT id FROM service_items WHERE service_id = $1 FOR UPDATE",
      [serviceId],
    );
    const allowed = new Set(result.rows.map((row) => row.id));
    if (itemIds.length !== allowed.size || itemIds.some((id) => !allowed.has(id))) {
      throw new Error("The service order changed. Refresh and try again.");
    }
    for (const [position, id] of itemIds.entries()) {
      await database.query(
        `UPDATE service_items
         SET position = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND service_id = $3`,
        [position, id, serviceId],
      );
    }
  });
  return getServicePlanWith(getDatabase(), serviceId);
}
