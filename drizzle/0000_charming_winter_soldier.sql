CREATE TABLE `auth_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key_hash` text NOT NULL,
	`role` text NOT NULL,
	`succeeded` integer DEFAULT false NOT NULL,
	`attempted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_auth_attempts_key_time` ON `auth_attempts` (`key_hash`,`attempted_at`);--> statement-breakpoint
CREATE TABLE `service_items` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`song_id` integer NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`song_id`) REFERENCES `songs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_service_items_service_position` ON `service_items` (`service_id`,`position`);--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`service_date` text NOT NULL,
	`label` text DEFAULT 'Sunday Worship' NOT NULL,
	`share_token` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_services_share_token` ON `services` (`share_token`);--> statement-breakpoint
CREATE INDEX `idx_services_date` ON `services` (`service_date`);--> statement-breakpoint
CREATE TABLE `songs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`youtube_video_id` text NOT NULL,
	`playlist_item_id` text,
	`title` text NOT NULL,
	`channel` text DEFAULT '' NOT NULL,
	`thumbnail_url` text NOT NULL,
	`duration` text DEFAULT '' NOT NULL,
	`playlist_position` integer DEFAULT 0 NOT NULL,
	`available` integer DEFAULT true NOT NULL,
	`synced_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_songs_youtube_video_id` ON `songs` (`youtube_video_id`);--> statement-breakpoint
CREATE INDEX `idx_songs_available_position` ON `songs` (`available`,`playlist_position`);--> statement-breakpoint
CREATE TABLE `sync_state` (
	`source` text PRIMARY KEY NOT NULL,
	`last_success_at` text,
	`last_attempt_at` text,
	`last_error` text
);
