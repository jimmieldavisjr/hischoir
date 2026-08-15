CREATE TABLE "auth_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"key_hash" text NOT NULL,
	"role" varchar(16) NOT NULL,
	"succeeded" boolean DEFAULT false NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"service_id" uuid NOT NULL,
	"song_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY NOT NULL,
	"service_date" date NOT NULL,
	"label" text DEFAULT 'Sabbath Worship' NOT NULL,
	"share_token" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "songs" (
	"id" serial PRIMARY KEY NOT NULL,
	"youtube_video_id" varchar(32) NOT NULL,
	"playlist_item_id" text,
	"title" text NOT NULL,
	"channel" text DEFAULT '' NOT NULL,
	"thumbnail_url" text NOT NULL,
	"duration" varchar(16) DEFAULT '' NOT NULL,
	"playlist_position" integer DEFAULT 0 NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_state" (
	"source" varchar(32) PRIMARY KEY NOT NULL,
	"last_success_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"last_error" text
);
--> statement-breakpoint
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_auth_attempts_key_time" ON "auth_attempts" USING btree ("key_hash","attempted_at");--> statement-breakpoint
CREATE INDEX "idx_service_items_service_position" ON "service_items" USING btree ("service_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_services_share_token" ON "services" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "idx_services_date" ON "services" USING btree ("service_date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_songs_youtube_video_id" ON "songs" USING btree ("youtube_video_id");--> statement-breakpoint
CREATE INDEX "idx_songs_available_position" ON "songs" USING btree ("available","playlist_position");