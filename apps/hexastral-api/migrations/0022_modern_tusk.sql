CREATE TABLE `physiognomy_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`reading_id` text,
	`horizon_months` integer DEFAULT 3 NOT NULL,
	`events_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `physio_events_user_idx` ON `physiognomy_events` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `physio_events_user_uniq` ON `physiognomy_events` (`user_id`);--> statement-breakpoint
ALTER TABLE `free_monthly_quotas` ADD `faceoracle_photo_slots` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `active_palm_left_feature_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `active_palm_right_feature_id` text;