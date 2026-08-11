import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const songs = pgTable(
  "songs",
  {
    id: serial("id").primaryKey(),
    youtubeVideoId: varchar("youtube_video_id", { length: 32 }).notNull(),
    playlistItemId: text("playlist_item_id"),
    title: text("title").notNull(),
    channel: text("channel").notNull().default(""),
    thumbnailUrl: text("thumbnail_url").notNull(),
    duration: varchar("duration", { length: 16 }).notNull().default(""),
    playlistPosition: integer("playlist_position").notNull().default(0),
    available: boolean("available").notNull().default(true),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_songs_youtube_video_id").on(table.youtubeVideoId),
    index("idx_songs_available_position").on(table.available, table.playlistPosition),
  ],
);

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey(),
    serviceDate: date("service_date", { mode: "string" }).notNull(),
    label: text("label").notNull().default("Sabbath Worship"),
    shareToken: varchar("share_token", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_services_share_token").on(table.shareToken),
    index("idx_services_date").on(table.serviceDate),
  ],
);

export const serviceItems = pgTable(
  "service_items",
  {
    id: uuid("id").primaryKey(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    songId: integer("song_id")
      .notNull()
      .references(() => songs.id),
    position: integer("position").notNull().default(0),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_service_items_service_position").on(table.serviceId, table.position)],
);

export const syncState = pgTable("sync_state", {
  source: varchar("source", { length: 32 }).primaryKey(),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  lastError: text("last_error"),
});

export const authAttempts = pgTable(
  "auth_attempts",
  {
    id: serial("id").primaryKey(),
    keyHash: text("key_hash").notNull(),
    role: varchar("role", { length: 16 }).notNull(),
    succeeded: boolean("succeeded").notNull().default(false),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_auth_attempts_key_time").on(table.keyHash, table.attemptedAt)],
);
