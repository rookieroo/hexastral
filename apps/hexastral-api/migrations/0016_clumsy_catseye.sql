CREATE TABLE `kindred_push_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`bond_id` text,
	`source_reading_id` text,
	`locale` text DEFAULT 'zh-CN' NOT NULL,
	`kind` text DEFAULT 'conditional' NOT NULL,
	`trigger_kind` text,
	`fire_on` text,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`source` text DEFAULT 'report' NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`created_at` text NOT NULL,
	`sent_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bond_id`) REFERENCES `user_bonds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_reading_id`) REFERENCES `pair_readings`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `kpq_user_status_idx` ON `kindred_push_queue` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `kpq_bond_idx` ON `kindred_push_queue` (`bond_id`);--> statement-breakpoint
CREATE INDEX `kpq_fireon_idx` ON `kindred_push_queue` (`fire_on`);