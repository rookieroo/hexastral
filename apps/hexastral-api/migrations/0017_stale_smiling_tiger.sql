CREATE TABLE `pro_monthly_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`month` text NOT NULL,
	`chat_used` integer DEFAULT 0 NOT NULL,
	`explain_used` integer DEFAULT 0 NOT NULL,
	`reroll_used` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pmu_user_month_idx` ON `pro_monthly_usage` (`user_id`,`month`);--> statement-breakpoint
CREATE UNIQUE INDEX `pmu_user_month_uniq` ON `pro_monthly_usage` (`user_id`,`month`);