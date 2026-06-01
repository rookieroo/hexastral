CREATE TABLE `chapter_unlock_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`inviter_user_id` text NOT NULL,
	`target_email` text NOT NULL,
	`token` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`message` text,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`redeemed_at` text,
	`redeemed_by_user_id` text,
	FOREIGN KEY (`inviter_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`redeemed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chapter_unlock_invitations_token_unique` ON `chapter_unlock_invitations` (`token`);--> statement-breakpoint
CREATE INDEX `cui_inviter_idx` ON `chapter_unlock_invitations` (`inviter_user_id`);--> statement-breakpoint
CREATE INDEX `cui_target_email_status_idx` ON `chapter_unlock_invitations` (`target_email`,`status`);--> statement-breakpoint
CREATE INDEX `cui_token_idx` ON `chapter_unlock_invitations` (`token`);--> statement-breakpoint
CREATE INDEX `cui_expires_status_idx` ON `chapter_unlock_invitations` (`expires_at`,`status`);