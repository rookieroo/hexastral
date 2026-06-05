CREATE TABLE `auspice_push_subs` (
	`device_id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`platform` text DEFAULT 'ios' NOT NULL,
	`timezone_id` text NOT NULL,
	`locale` text DEFAULT 'zh' NOT NULL,
	`birth_date` text,
	`birth_hour` integer,
	`gender` text,
	`daily_morning` integer DEFAULT true NOT NULL,
	`daily_evening` integer DEFAULT true NOT NULL,
	`birthday_on` integer DEFAULT true NOT NULL,
	`holiday_on` integer DEFAULT true NOT NULL,
	`relationship_on` integer DEFAULT true NOT NULL,
	`is_pro` integer DEFAULT false NOT NULL,
	`last_active_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auspice_push_subs_tz_idx` ON `auspice_push_subs` (`timezone_id`);--> statement-breakpoint
CREATE TABLE `birthday_reminders` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`solar_date` text NOT NULL,
	`calendar` text DEFAULT 'solar' NOT NULL,
	`relation` text,
	`advance_days` integer DEFAULT 1 NOT NULL,
	`remind_on_day` integer DEFAULT true NOT NULL,
	`month_day` text,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE INDEX `birthday_reminders_owner_idx` ON `birthday_reminders` (`owner`);--> statement-breakpoint
CREATE INDEX `birthday_reminders_month_day_idx` ON `birthday_reminders` (`month_day`);--> statement-breakpoint
ALTER TABLE `user_bonds` ADD `chapters_unlocked` integer DEFAULT false NOT NULL;