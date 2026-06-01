ALTER TABLE `pair_readings` ADD `person_b_longitude` text;--> statement-breakpoint
ALTER TABLE `pair_readings` ADD `person_b_latitude` text;--> statement-breakpoint
ALTER TABLE `pair_readings` ADD `person_b_timezone_id` text;--> statement-breakpoint
ALTER TABLE `pair_readings` ADD `person_b_calendar_type` text;--> statement-breakpoint
ALTER TABLE `pair_readings` ADD `person_b_lunar_date` text;--> statement-breakpoint
ALTER TABLE `pair_readings` ADD `person_b_is_leap_month` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `user_bonds` ADD `target_birth_longitude` text;--> statement-breakpoint
ALTER TABLE `user_bonds` ADD `target_birth_latitude` text;--> statement-breakpoint
ALTER TABLE `user_bonds` ADD `target_birth_timezone_id` text;--> statement-breakpoint
ALTER TABLE `user_bonds` ADD `target_birth_calendar_type` text;--> statement-breakpoint
ALTER TABLE `user_bonds` ADD `target_birth_lunar_date` text;--> statement-breakpoint
ALTER TABLE `user_bonds` ADD `target_birth_is_leap_month` integer DEFAULT false;