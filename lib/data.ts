import { ensureSchema } from "@/db";
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
  available: number;
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
    available: Boolean(row.available),
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
  const database = await ensureSchema();
  brandReady ??= database
    .prepare(
      `UPDATE services
       SET service_date = CASE
         WHEN strftime('%w', service_date) = '0' THEN date(service_date, '-1 day')
         ELSE service_date
       END,
       label = 'Sabbath Worship',
       updated_at = CURRENT_TIMESTAMP
       WHERE label = 'Sunday Worship'`,
    )
    .run();
  await brandReady;
  await seedPlaylistSnapshot();
  const count = await database.prepare("SELECT COUNT(*) AS count FROM services").first<{ count: number }>();
  if (Number(count?.count ?? 0) === 0) {
    await database
      .prepare("INSERT INTO services (id, service_date, label, share_token) VALUES (?, ?, ?, ?)")
      .bind(crypto.randomUUID(), nextSabbath(), "Sabbath Worship", randomToken())
      .run();
  }
  return database;
}

export async function listServices(): Promise<ServiceSummary[]> {
  const database = await prepareAppData();
  const result = await database
    .prepare(
      `SELECT s.id, s.service_date, s.label, s.share_token, COUNT(si.id) AS item_count
       FROM services s LEFT JOIN service_items si ON si.service_id = s.id
       GROUP BY s.id ORDER BY s.service_date ASC, s.created_at ASC`,
    )
    .all<ServiceRow>();
  return result.results.map(mapService);
}

export async function getServicePlan(identifier: string, byToken = false): Promise<ServicePlan | null> {
  const database = await prepareAppData();
  const column = byToken ? "share_token" : "id";
  const row = await database
    .prepare(
      `SELECT s.id, s.service_date, s.label, s.share_token, COUNT(si.id) AS item_count
       FROM services s LEFT JOIN service_items si ON si.service_id = s.id
       WHERE s.${column} = ? GROUP BY s.id`,
    )
    .bind(identifier)
    .first<ServiceRow>();
  if (!row) return null;

  const result = await database
    .prepare(
      `SELECT si.id AS item_id, si.position, si.notes,
              so.id, so.youtube_video_id, so.title, so.channel, so.thumbnail_url,
              so.duration, so.playlist_position, so.available
       FROM service_items si JOIN songs so ON so.id = si.song_id
       WHERE si.service_id = ? ORDER BY si.position ASC, si.created_at ASC`,
    )
    .bind(row.id)
    .all<ItemRow>();
  const items: ServiceItem[] = result.results.map((item) => ({
    ...mapSong(item),
    itemId: item.item_id,
    position: item.position,
    notes: item.notes,
  }));
  return { ...mapService(row), items };
}

async function getSyncState(): Promise<SyncState> {
  const database = await ensureSchema();
  const row = await database
    .prepare("SELECT last_success_at, last_attempt_at, last_error FROM sync_state WHERE source = 'youtube'")
    .first<{ last_success_at: string | null; last_attempt_at: string | null; last_error: string | null }>();
  return {
    lastSuccessAt: row?.last_success_at ?? null,
    lastAttemptAt: row?.last_attempt_at ?? null,
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

  const [songRows, services] = await Promise.all([
    database
      .prepare(
        `SELECT id, youtube_video_id, title, channel, thumbnail_url, duration,
                playlist_position, available FROM songs
         ORDER BY available DESC, playlist_position ASC, title ASC`,
      )
      .all<SongRow>(),
    listServices(),
  ]);
  const selected = services.find((service) => service.id === serviceId) ?? services[0] ?? null;
  return {
    songs: songRows.results.map(mapSong),
    services,
    selectedService: selected ? await getServicePlan(selected.id) : null,
    sync,
    playlistId: PLAYLIST_ID,
    configured: hasYouTubeKey(),
  };
}

export async function createService(serviceDate: string, label: string) {
  const database = await prepareAppData();
  const id = crypto.randomUUID();
  await database
    .prepare("INSERT INTO services (id, service_date, label, share_token) VALUES (?, ?, ?, ?)")
    .bind(id, serviceDate, label, randomToken())
    .run();
  return getServicePlan(id);
}

export async function updateService(id: string, serviceDate: string, label: string) {
  const database = await prepareAppData();
  await database
    .prepare("UPDATE services SET service_date = ?, label = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(serviceDate, label, id)
    .run();
  return getServicePlan(id);
}

export async function deleteService(id: string) {
  const database = await prepareAppData();
  await database.prepare("DELETE FROM services WHERE id = ?").bind(id).run();
}

export async function duplicateService(id: string, serviceDate: string) {
  const database = await prepareAppData();
  const source = await getServicePlan(id);
  if (!source) throw new Error("Service plan not found.");
  const duplicateId = crypto.randomUUID();
  const writes = [
    database
      .prepare("INSERT INTO services (id, service_date, label, share_token) VALUES (?, ?, ?, ?)")
      .bind(duplicateId, serviceDate, source.label, randomToken()),
  ];
  for (const item of source.items) {
    writes.push(
      database
        .prepare("INSERT INTO service_items (id, service_id, song_id, position, notes) VALUES (?, ?, ?, ?, ?)")
        .bind(crypto.randomUUID(), duplicateId, item.id, item.position, item.notes),
    );
  }
  await database.batch(writes);
  return getServicePlan(duplicateId);
}

export async function addSong(serviceId: string, songId: number) {
  const database = await prepareAppData();
  const position = await database
    .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS position FROM service_items WHERE service_id = ?")
    .bind(serviceId)
    .first<{ position: number }>();
  await database
    .prepare("INSERT INTO service_items (id, service_id, song_id, position) VALUES (?, ?, ?, ?)")
    .bind(crypto.randomUUID(), serviceId, songId, Number(position?.position ?? 0))
    .run();
  return getServicePlan(serviceId);
}

export async function updateItem(serviceId: string, itemId: string, notes: string) {
  const database = await prepareAppData();
  await database
    .prepare(
      "UPDATE service_items SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND service_id = ?",
    )
    .bind(notes, itemId, serviceId)
    .run();
  return getServicePlan(serviceId);
}

export async function removeItem(serviceId: string, itemId: string) {
  const database = await prepareAppData();
  await database.prepare("DELETE FROM service_items WHERE id = ? AND service_id = ?").bind(itemId, serviceId).run();
  const rows = await database
    .prepare("SELECT id FROM service_items WHERE service_id = ? ORDER BY position, created_at")
    .bind(serviceId)
    .all<{ id: string }>();
  if (rows.results.length) {
    await database.batch(
      rows.results.map((row, position) =>
        database.prepare("UPDATE service_items SET position = ? WHERE id = ?").bind(position, row.id),
      ),
    );
  }
  return getServicePlan(serviceId);
}

export async function reorderItems(serviceId: string, itemIds: string[]) {
  const database = await prepareAppData();
  const existing = await database
    .prepare("SELECT id FROM service_items WHERE service_id = ?")
    .bind(serviceId)
    .all<{ id: string }>();
  const allowed = new Set(existing.results.map((row) => row.id));
  if (itemIds.length !== allowed.size || itemIds.some((id) => !allowed.has(id))) {
    throw new Error("The service order changed. Refresh and try again.");
  }
  if (itemIds.length) {
    await database.batch(
      itemIds.map((id, position) =>
        database
          .prepare("UPDATE service_items SET position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND service_id = ?")
          .bind(position, id, serviceId),
      ),
    );
  }
  return getServicePlan(serviceId);
}
