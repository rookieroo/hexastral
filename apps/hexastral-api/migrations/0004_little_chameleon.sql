DROP TABLE `subscription_quotas`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `subscription_status`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `subscription_plan`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `subscription_expires_at`;