CREATE TABLE `timeline_readings` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`birth_date` text NOT NULL,
	`birth_hour` integer NOT NULL,
	`gender` text NOT NULL,
	`node_type` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer DEFAULT 0 NOT NULL,
	`reading` text NOT NULL,
	`tier` text DEFAULT 'standard' NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE INDEX `timeline_readings_owner_profile_idx` ON `timeline_readings` (`owner`,`birth_date`,`birth_hour`,`gender`);--> statement-breakpoint
ALTER TABLE `auspice_push_subs` ADD `timeline_remind_on` integer DEFAULT true NOT NULL;