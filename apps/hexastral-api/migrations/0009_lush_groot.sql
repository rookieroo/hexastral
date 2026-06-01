CREATE TABLE `life_timeline_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`context_key` text NOT NULL,
	`content_json` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ltc_expires_at_idx` ON `life_timeline_cache` (`expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `ltc_context_key_uq` ON `life_timeline_cache` (`context_key`);