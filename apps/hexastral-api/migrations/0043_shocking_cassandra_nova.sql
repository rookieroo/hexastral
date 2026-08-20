PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_faceoracle_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`stage` text DEFAULT 'queued' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`locale` text DEFAULT 'zh' NOT NULL,
	`output_kind` text DEFAULT 'oneshot' NOT NULL,
	`horizon_months` integer DEFAULT 3 NOT NULL,
	`face_feature_id` text,
	`palm_left_feature_id` text,
	`palm_right_feature_id` text,
	`ephemeral_keys_json` text,
	`solar_date` text NOT NULL,
	`time_index` integer NOT NULL,
	`gender` text NOT NULL,
	`city` text,
	`reading_id` text,
	`error_message` text,
	`notify_on_complete` integer DEFAULT true NOT NULL,
	`access_via` text,
	`credit_source` text,
	`slots_charged` integer DEFAULT 0 NOT NULL,
	`refunded` integer DEFAULT false NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_faceoracle_jobs`("id", "user_id", "stage", "progress", "locale", "output_kind", "horizon_months", "face_feature_id", "palm_left_feature_id", "palm_right_feature_id", "ephemeral_keys_json", "solar_date", "time_index", "gender", "city", "reading_id", "error_message", "notify_on_complete", "access_via", "credit_source", "slots_charged", "refunded", "started_at", "finished_at", "created_at") SELECT "id", "user_id", "stage", "progress", "locale", "output_kind", "horizon_months", "face_feature_id", "palm_left_feature_id", "palm_right_feature_id", NULL, "solar_date", "time_index", "gender", "city", "reading_id", "error_message", "notify_on_complete", "access_via", "credit_source", "slots_charged", "refunded", "started_at", "finished_at", "created_at" FROM `faceoracle_jobs`;--> statement-breakpoint
DROP TABLE `faceoracle_jobs`;--> statement-breakpoint
ALTER TABLE `__new_faceoracle_jobs` RENAME TO `faceoracle_jobs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `fo_jobs_user_stage_idx` ON `faceoracle_jobs` (`user_id`,`stage`);--> statement-breakpoint
CREATE INDEX `fo_jobs_user_created_idx` ON `faceoracle_jobs` (`user_id`,`created_at`);
