CREATE TABLE `auspice_push_sends` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`slot` text NOT NULL,
	`date` text NOT NULL,
	`body_key` text,
	`variant` text,
	`ticket_id` text,
	`status` text DEFAULT 'sent' NOT NULL,
	`locale` text,
	`is_pro` integer DEFAULT 0 NOT NULL,
	`timezone_id` text,
	`created_at` text NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auspice_push_sends_uniq` ON `auspice_push_sends` (`device_id`,`date`,`slot`);--> statement-breakpoint
CREATE INDEX `auspice_push_sends_date_idx` ON `auspice_push_sends` (`date`,`slot`);--> statement-breakpoint
CREATE TABLE `auspice_push_opens` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`notification_id` text,
	`slot` text NOT NULL,
	`date` text,
	`body_key` text,
	`person_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auspice_push_opens_uniq` ON `auspice_push_opens` (`device_id`,`notification_id`);--> statement-breakpoint
CREATE INDEX `auspice_push_opens_date_idx` ON `auspice_push_opens` (`date`,`slot`);