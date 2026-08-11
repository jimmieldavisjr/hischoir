import { env } from "cloudflare:workers";

const statements = [
  `CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    youtube_video_id TEXT NOT NULL,
    playlist_item_id TEXT,
    title TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT '',
    thumbnail_url TEXT NOT NULL,
    duration TEXT NOT NULL DEFAULT '',
    playlist_position INTEGER NOT NULL DEFAULT 0,
    available INTEGER NOT NULL DEFAULT 1,
    synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_songs_youtube_video_id ON songs(youtube_video_id)`,
  `CREATE INDEX IF NOT EXISTS idx_songs_available_position ON songs(available, playlist_position)`,
  `CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    service_date TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT 'Sabbath Worship',
    share_token TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_services_share_token ON services(share_token)`,
  `CREATE INDEX IF NOT EXISTS idx_services_date ON services(service_date)`,
  `CREATE TABLE IF NOT EXISTS service_items (
    id TEXT PRIMARY KEY,
    service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    song_id INTEGER NOT NULL REFERENCES songs(id),
    position INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_service_items_service_position ON service_items(service_id, position)`,
  `CREATE TABLE IF NOT EXISTS sync_state (
    source TEXT PRIMARY KEY,
    last_success_at TEXT,
    last_attempt_at TEXT,
    last_error TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS auth_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    succeeded INTEGER NOT NULL DEFAULT 0,
    attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_auth_attempts_key_time ON auth_attempts(key_hash, attempted_at)`,
];

let schemaReady: Promise<void> | undefined;

export function getD1(): D1Database {
  const database = (env as unknown as { DB?: D1Database }).DB;
  if (!database) {
    throw new Error("The HisChoir database is unavailable.");
  }
  return database;
}

export async function ensureSchema(): Promise<D1Database> {
  const database = getD1();
  schemaReady ??= database
    .batch(statements.map((statement) => database.prepare(statement)))
    .then(async () => {
      await database.prepare("PRAGMA optimize").run();
    })
    .catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  await schemaReady;
  return database;
}
