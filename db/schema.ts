import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const songs = sqliteTable(
  "songs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    youtubeVideoId: text("youtube_video_id").notNull(),
    playlistItemId: text("playlist_item_id"),
    title: text("title").notNull(),
    channel: text("channel").notNull().default(""),
    thumbnailUrl: text("thumbnail_url").notNull(),
    duration: text("duration").notNull().default(""),
    playlistPosition: integer("playlist_position").notNull().default(0),
    available: integer("available", { mode: "boolean" }).notNull().default(true),
    syncedAt: text("synced_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_songs_youtube_video_id").on(table.youtubeVideoId),
    index("idx_songs_available_position").on(table.available, table.playlistPosition),
  ],
);

export const services = sqliteTable(
  "services",
  {
    id: text("id").primaryKey(),
    serviceDate: text("service_date").notNull(),
    label: text("label").notNull().default("Sabbath Worship"),
    shareToken: text("share_token").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_services_share_token").on(table.shareToken),
    index("idx_services_date").on(table.serviceDate),
  ],
);

export const serviceItems = sqliteTable(
  "service_items",
  {
    id: text("id").primaryKey(),
    serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
    songId: integer("song_id").notNull().references(() => songs.id),
    position: integer("position").notNull().default(0),
    notes: text("notes").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_service_items_service_position").on(table.serviceId, table.position)],
);

export const syncState = sqliteTable("sync_state", {
  source: text("source").primaryKey(),
  lastSuccessAt: text("last_success_at"),
  lastAttemptAt: text("last_attempt_at"),
  lastError: text("last_error"),
});

export const authAttempts = sqliteTable(
  "auth_attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    keyHash: text("key_hash").notNull(),
    role: text("role").notNull(),
    succeeded: integer("succeeded", { mode: "boolean" }).notNull().default(false),
    attemptedAt: text("attempted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_auth_attempts_key_time").on(table.keyHash, table.attemptedAt)],
);
