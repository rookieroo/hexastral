ALTER TABLE `faceoracle_jobs` ADD `credit_source` text;--> statement-breakpoint
ALTER TABLE `faceoracle_jobs` ADD `slots_charged` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `faceoracle_jobs` ADD `refunded` integer DEFAULT false NOT NULL;