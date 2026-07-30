ALTER TABLE `users` ADD `birth_source_app` text;--> statement-breakpoint
ALTER TABLE `users` ADD `birth_owner_installation_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `birth_multi_device_sync_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `birth_cross_app_sync_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `birth_updated_at` text;