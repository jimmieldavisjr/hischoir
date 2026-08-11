PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_services` (
	`id` text PRIMARY KEY NOT NULL,
	`service_date` text NOT NULL,
	`label` text DEFAULT 'Sabbath Worship' NOT NULL,
	`share_token` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_services`("id", "service_date", "label", "share_token", "created_at", "updated_at") SELECT "id", "service_date", "label", "share_token", "created_at", "updated_at" FROM `services`;--> statement-breakpoint
DROP TABLE `services`;--> statement-breakpoint
ALTER TABLE `__new_services` RENAME TO `services`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_services_share_token` ON `services` (`share_token`);--> statement-breakpoint
CREATE INDEX `idx_services_date` ON `services` (`service_date`);--> statement-breakpoint
UPDATE `services`
SET `service_date` = CASE
      WHEN strftime('%w', `service_date`) = '0' THEN date(`service_date`, '-1 day')
      ELSE `service_date`
    END,
    `label` = 'Sabbath Worship',
    `updated_at` = CURRENT_TIMESTAMP
WHERE `label` = 'Sunday Worship';
