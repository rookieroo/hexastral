CREATE TABLE `faceoracle_push_subs` (
	`user_id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`platform` text DEFAULT 'ios' NOT NULL,
	`timezone_id` text NOT NULL,
	`locale` text DEFAULT 'zh' NOT NULL,
	`recapture_on` integer DEFAULT true NOT NULL,
	`events_on` integer DEFAULT true NOT NULL,
	`is_pro` integer DEFAULT false NOT NULL,
	`last_reading_at` text,
	`last_active_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `faceoracle_push_subs_tz_idx` ON `faceoracle_push_subs` (`timezone_id`);