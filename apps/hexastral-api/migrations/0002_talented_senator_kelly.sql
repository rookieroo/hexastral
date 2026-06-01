CREATE TABLE `user_credits` (
	`user_id` text NOT NULL,
	`credit_type` text NOT NULL,
	`source` text NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`period_key` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `credit_type`, `source`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
