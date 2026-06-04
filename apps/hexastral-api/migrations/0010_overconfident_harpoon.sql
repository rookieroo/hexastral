CREATE TABLE `makeif_forks` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`birth_date` text NOT NULL,
	`birth_hour` integer NOT NULL,
	`gender` text NOT NULL,
	`event` text NOT NULL,
	`label` text NOT NULL,
	`diverge_at_age` integer NOT NULL,
	`merge_at_age` integer,
	`is_past` integer DEFAULT false NOT NULL,
	`real_pillar` text,
	`narrative` text NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE INDEX `makeif_forks_owner_profile_idx` ON `makeif_forks` (`owner`,`birth_date`,`birth_hour`,`gender`);
