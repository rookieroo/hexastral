CREATE TABLE `watch_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`secret_hash` text NOT NULL,
	`scope` text DEFAULT 'auspice:watch:read' NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`last_used_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `watch_credentials_user_id_idx` ON `watch_credentials` (`user_id`);