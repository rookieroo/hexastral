CREATE TABLE `user_growth_attributions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`anonymous_id` text,
	`target_app` text,
	`click_ids_json` text DEFAULT '{}' NOT NULL,
	`utm_json` text DEFAULT '{}' NOT NULL,
	`landing_path` text,
	`claimed_at_ms` integer NOT NULL,
	`expires_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `uga_user_idx` ON `user_growth_attributions` (`user_id`);--> statement-breakpoint
CREATE INDEX `uga_anon_idx` ON `user_growth_attributions` (`anonymous_id`);--> statement-breakpoint
CREATE INDEX `uga_expires_idx` ON `user_growth_attributions` (`expires_at`);