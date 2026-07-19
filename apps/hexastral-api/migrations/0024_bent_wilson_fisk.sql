CREATE TABLE `faceoracle_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`stage` text DEFAULT 'queued' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`locale` text DEFAULT 'zh' NOT NULL,
	`output_kind` text DEFAULT 'oneshot' NOT NULL,
	`horizon_months` integer DEFAULT 3 NOT NULL,
	`face_feature_id` text NOT NULL,
	`palm_left_feature_id` text NOT NULL,
	`palm_right_feature_id` text NOT NULL,
	`solar_date` text NOT NULL,
	`time_index` integer NOT NULL,
	`gender` text NOT NULL,
	`city` text,
	`reading_id` text,
	`error_message` text,
	`notify_on_complete` integer DEFAULT true NOT NULL,
	`access_via` text,
	`started_at` text NOT NULL,
	`finished_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `fo_jobs_user_stage_idx` ON `faceoracle_jobs` (`user_id`,`stage`);--> statement-breakpoint
CREATE INDEX `fo_jobs_user_created_idx` ON `faceoracle_jobs` (`user_id`,`created_at`);