CREATE TABLE `faceoracle_daily_quotas` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`shallow_used` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `fdq_user_day_idx` ON `faceoracle_daily_quotas` (`user_id`,`day`);--> statement-breakpoint
CREATE UNIQUE INDEX `fdq_user_day_uniq` ON `faceoracle_daily_quotas` (`user_id`,`day`);--> statement-breakpoint
ALTER TABLE `free_monthly_quotas` ADD `faceoracle_deep_reads` integer DEFAULT 0 NOT NULL;