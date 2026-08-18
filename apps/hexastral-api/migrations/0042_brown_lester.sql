CREATE TABLE `lantai_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`workspace_name` text,
	`token_ciphertext` text NOT NULL,
	`token_nonce` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lantai_conn_user_idx` ON `lantai_connections` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `lantai_conn_user_ws_uq` ON `lantai_connections` (`user_id`,`workspace_id`);--> statement-breakpoint
CREATE TABLE `lantai_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`connection_id` text NOT NULL,
	`database_id` text NOT NULL,
	`mode` text NOT NULL,
	`command_json` text NOT NULL,
	`revoked_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connection_id`) REFERENCES `lantai_connections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lantai_cfg_user_idx` ON `lantai_configs` (`user_id`);--> statement-breakpoint
CREATE INDEX `lantai_cfg_user_revoked_idx` ON `lantai_configs` (`user_id`,`revoked_at`);--> statement-breakpoint
CREATE TABLE `lantai_usage` (
	`user_id` text NOT NULL,
	`template_id` text NOT NULL,
	`period` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `template_id`, `period`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
