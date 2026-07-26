-- Syel dated push fuel (replace-on-new-reading; cron sends without LLM).
CREATE TABLE `faceoracle_push_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_reading_id` text,
	`locale` text DEFAULT 'zh' NOT NULL,
	`fire_on` text NOT NULL,
	`local_hour` integer DEFAULT 9 NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`kind` text DEFAULT 'other' NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`data_json` text,
	`expires_at` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`created_at` text NOT NULL,
	`sent_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `fpq_user_status_idx` ON `faceoracle_push_queue` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `fpq_fireon_idx` ON `faceoracle_push_queue` (`fire_on`);
