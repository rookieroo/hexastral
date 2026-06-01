CREATE TABLE `analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`target_app` text DEFAULT 'hexastral' NOT NULL,
	`analysis_type` text NOT NULL,
	`facing_direction` text NOT NULL,
	`birth_year` integer,
	`gender` text,
	`construction_period` integer,
	`label` text,
	`eight_house_data` text,
	`flying_star_data` text,
	`interpretation` text,
	`bookmarked` integer DEFAULT false NOT NULL,
	`rating` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `analyses_user_created_idx` ON `analyses` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `analyses_target_app_user_idx` ON `analyses` (`target_app`,`user_id`);--> statement-breakpoint
CREATE TABLE `archetype_presets` (
	`id` text PRIMARY KEY NOT NULL,
	`day_stem` text NOT NULL,
	`month_branch` text NOT NULL,
	`gender` text NOT NULL,
	`lang` text NOT NULL,
	`bullet_1` text NOT NULL,
	`bullet_2` text NOT NULL,
	`bullet_3` text NOT NULL,
	`fate_tease` text NOT NULL,
	`warning` text NOT NULL,
	`variant` text DEFAULT 'A' NOT NULL,
	`impressions` integer DEFAULT 0 NOT NULL,
	`conversions` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ap_lookup_idx` ON `archetype_presets` (`day_stem`,`month_branch`,`gender`,`lang`,`active`);--> statement-breakpoint
CREATE UNIQUE INDEX `ap_stem_branch_gender_lang_variant_uniq` ON `archetype_presets` (`day_stem`,`month_branch`,`gender`,`lang`,`variant`);--> statement-breakpoint
CREATE TABLE `bond_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`bond_id` text NOT NULL,
	`inviter_user_id` text NOT NULL,
	`target_email` text NOT NULL,
	`token` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`message` text,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`responded_at` text,
	FOREIGN KEY (`bond_id`) REFERENCES `user_bonds`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`inviter_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bond_invitations_token_unique` ON `bond_invitations` (`token`);--> statement-breakpoint
CREATE INDEX `bi_token_idx` ON `bond_invitations` (`token`);--> statement-breakpoint
CREATE INDEX `bi_inviter_idx` ON `bond_invitations` (`inviter_user_id`);--> statement-breakpoint
CREATE INDEX `bi_target_email_status_idx` ON `bond_invitations` (`target_email`,`status`);--> statement-breakpoint
CREATE INDEX `bi_expires_status_idx` ON `bond_invitations` (`expires_at`,`status`);--> statement-breakpoint
CREATE TABLE `bond_invite_credits` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`invite_id` text NOT NULL,
	`earned_from` text NOT NULL,
	`consumed` integer DEFAULT false NOT NULL,
	`consumed_at` text,
	`consumed_reading_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invite_id`) REFERENCES `bond_invitations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `bic_user_consumed_idx` ON `bond_invite_credits` (`user_id`,`consumed`);--> statement-breakpoint
CREATE UNIQUE INDEX `bic_invite_earned_uniq` ON `bond_invite_credits` (`invite_id`,`earned_from`);--> statement-breakpoint
CREATE TABLE `chart_glossary` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`category` text NOT NULL,
	`lang` text NOT NULL,
	`title` text NOT NULL,
	`body_md` text NOT NULL,
	`variant` text DEFAULT 'A' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cg_lookup_idx` ON `chart_glossary` (`key`,`lang`,`active`);--> statement-breakpoint
CREATE UNIQUE INDEX `cg_key_lang_variant_uniq` ON `chart_glossary` (`key`,`lang`,`variant`);--> statement-breakpoint
CREATE TABLE `compass_bearings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`lat` text NOT NULL,
	`lng` text NOT NULL,
	`bearing_deg_true` text NOT NULL,
	`bearing_deg_magnetic` text NOT NULL,
	`magnetic_declination` text NOT NULL,
	`label` text,
	`photo_r2_key` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cb_user_created_idx` ON `compass_bearings` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `contact_hashes` (
	`user_id` text NOT NULL,
	`phone_hash` text NOT NULL,
	`uploaded_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ch_phone_hash_idx` ON `contact_hashes` (`phone_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `ch_user_hash_uniq` ON `contact_hashes` (`user_id`,`phone_hash`);--> statement-breakpoint
CREATE TABLE `conversation_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`target_app` text DEFAULT 'hexastral' NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cm_conv_created_idx` ON `conversation_messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `cm_target_app_conv_idx` ON `conversation_messages` (`target_app`,`conversation_id`);--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`target_app` text DEFAULT 'hexastral' NOT NULL,
	`reading_type` text NOT NULL,
	`reading_id` text NOT NULL,
	`message_count` integer DEFAULT 0 NOT NULL,
	`free_messages_used` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `conv_user_type_idx` ON `conversations` (`user_id`,`reading_type`);--> statement-breakpoint
CREATE INDEX `conv_target_app_user_idx` ON `conversations` (`target_app`,`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `conv_user_reading_app_uniq` ON `conversations` (`user_id`,`reading_id`,`target_app`);--> statement-breakpoint
CREATE TABLE `daily_activity` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`target_app` text DEFAULT 'hexastral' NOT NULL,
	`date` text NOT NULL,
	`reading_count` integer DEFAULT 0 NOT NULL,
	`analysis_count` integer DEFAULT 0 NOT NULL,
	`divination_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `da_user_date_idx` ON `daily_activity` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `da_target_app_user_idx` ON `daily_activity` (`target_app`,`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `da_user_date_app_uniq` ON `daily_activity` (`user_id`,`date`,`target_app`);--> statement-breakpoint
CREATE TABLE `daily_almanac` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`relation` text NOT NULL,
	`energy_level` text NOT NULL,
	`headline` text NOT NULL,
	`today_lens` text NOT NULL,
	`watch_for` text NOT NULL,
	`lucky_hour` text,
	`lucky_direction` text,
	`lucky_color` text,
	`locale` text NOT NULL,
	`notification_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `dalm_user_date_idx` ON `daily_almanac` (`user_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `dalm_user_date_uniq` ON `daily_almanac` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `daily_signals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`chart_hash` text NOT NULL,
	`content_json` text NOT NULL,
	`locale` text NOT NULL,
	`explanation_mode` text NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`is_current` integer DEFAULT true NOT NULL,
	`generated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ds_user_date_current_idx` ON `daily_signals` (`user_id`,`date`,`is_current`);--> statement-breakpoint
CREATE INDEX `ds_user_date_generated_idx` ON `daily_signals` (`user_id`,`date`,`generated_at`);--> statement-breakpoint
CREATE TABLE `divinations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`target_app` text DEFAULT 'hexastral' NOT NULL,
	`question` text NOT NULL,
	`hexagram_number` integer NOT NULL,
	`hexagram_name` text NOT NULL,
	`changing_lines` text DEFAULT '[]' NOT NULL,
	`interpretation` text NOT NULL,
	`advice` text NOT NULL,
	`summary` text NOT NULL,
	`fortune` text NOT NULL,
	`method` text DEFAULT 'liuyao' NOT NULL,
	`entropy_source` text,
	`bookmarked` integer DEFAULT false NOT NULL,
	`rating` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `divinations_user_created_idx` ON `divinations` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `divinations_target_app_user_idx` ON `divinations` (`target_app`,`user_id`);--> statement-breakpoint
CREATE TABLE `feng_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`user_id` text NOT NULL,
	`stage` text DEFAULT 'maps' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`report_id` text,
	`error_message` text,
	`started_at` text NOT NULL,
	`finished_at` text,
	FOREIGN KEY (`site_id`) REFERENCES `feng_sites`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`report_id`) REFERENCES `feng_reports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `fj_site_started_idx` ON `feng_jobs` (`site_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `fj_user_stage_idx` ON `feng_jobs` (`user_id`,`stage`);--> statement-breakpoint
CREATE TABLE `feng_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`user_id` text NOT NULL,
	`feng_year` integer NOT NULL,
	`current_yuan` integer NOT NULL,
	`vision_json` text NOT NULL,
	`compute_json` text NOT NULL,
	`chapters` text NOT NULL,
	`data_quality` text NOT NULL,
	`model_versions` text NOT NULL,
	`annotated_map_keys` text,
	`generated_at` text NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `feng_sites`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `fr_site_year_idx` ON `feng_reports` (`site_id`,`feng_year`);--> statement-breakpoint
CREATE INDEX `fr_user_generated_idx` ON `feng_reports` (`user_id`,`generated_at`);--> statement-breakpoint
CREATE TABLE `feng_sites` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`label` text,
	`lat` text NOT NULL,
	`lng` text NOT NULL,
	`formatted_address` text NOT NULL,
	`facing_deg_true` text NOT NULL,
	`facing_deg_magnetic` text NOT NULL,
	`magnetic_declination` text NOT NULL,
	`sit_deg_true` text NOT NULL,
	`door_deg_true` text,
	`build_year` integer,
	`build_year_accuracy` text DEFAULT 'unknown' NOT NULL,
	`move_in_year` integer,
	`floor` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `fs_user_idx` ON `feng_sites` (`user_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `fs_user_updated_idx` ON `feng_sites` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `free_monthly_quotas` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`month` text NOT NULL,
	`divination_used` integer DEFAULT 0 NOT NULL,
	`physiognomy_uploads` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `fmq_user_month_idx` ON `free_monthly_quotas` (`user_id`,`month`);--> statement-breakpoint
CREATE UNIQUE INDEX `fmq_user_month_uniq` ON `free_monthly_quotas` (`user_id`,`month`);--> statement-breakpoint
CREATE TABLE `global_chart_interpretations` (
	`id` text PRIMARY KEY NOT NULL,
	`input_hash` text NOT NULL,
	`chart_type` text NOT NULL,
	`chart_data` text NOT NULL,
	`hooks` text,
	`full_reading` text,
	`engine_version` text NOT NULL,
	`hit_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `gci_hash_type_idx` ON `global_chart_interpretations` (`input_hash`,`chart_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `gci_hash_type_version_uniq` ON `global_chart_interpretations` (`input_hash`,`chart_type`,`engine_version`);--> statement-breakpoint
CREATE TABLE `life_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`event_date` text NOT NULL,
	`event_type` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`ai_interpretation` text,
	`dayun_index` integer,
	`liunian_ganzhi` text,
	`verified_at` text,
	`stamp_label` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `le_user_date_idx` ON `life_events` (`user_id`,`event_date`);--> statement-breakpoint
CREATE INDEX `le_user_type_idx` ON `life_events` (`user_id`,`event_type`);--> statement-breakpoint
CREATE TABLE `notification_attributions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`notification_id` text NOT NULL,
	`product_id` text NOT NULL,
	`sku_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `na_user_idx` ON `notification_attributions` (`user_id`);--> statement-breakpoint
CREATE INDEX `na_notification_idx` ON `notification_attributions` (`notification_id`);--> statement-breakpoint
CREATE TABLE `pair_annual_forecasts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`pair_reading_id` text NOT NULL,
	`query_year` integer NOT NULL,
	`interpretation` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pair_reading_id`) REFERENCES `pair_readings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `paf_user_idx` ON `pair_annual_forecasts` (`user_id`);--> statement-breakpoint
CREATE INDEX `paf_pair_reading_idx` ON `pair_annual_forecasts` (`pair_reading_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `paf_pair_year_uniq` ON `pair_annual_forecasts` (`pair_reading_id`,`query_year`);--> statement-breakpoint
CREATE TABLE `pair_readings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`person_a_solar_date` text NOT NULL,
	`person_a_time_index` integer NOT NULL,
	`person_a_gender` text NOT NULL,
	`person_a_name` text,
	`person_b_solar_date` text NOT NULL,
	`person_b_time_index` integer NOT NULL,
	`person_b_gender` text NOT NULL,
	`person_b_name` text,
	`score` integer NOT NULL,
	`grade` text NOT NULL,
	`archetype_name` text,
	`archetype_tagline` text,
	`archetype_category` text,
	`hook_dimension` text,
	`relationship_category` text,
	`custom_relationship_label` text,
	`compatibility_data` text NOT NULL,
	`interpretation` text NOT NULL,
	`bookmarked` integer DEFAULT false NOT NULL,
	`rating` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `pair_user_created_idx` ON `pair_readings` (`user_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `pair_combo_uniq` ON `pair_readings` (`user_id`,`person_a_solar_date`,`person_a_time_index`,`person_b_solar_date`,`person_b_time_index`);--> statement-breakpoint
CREATE TABLE `physiognomy_readings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`target_app` text DEFAULT 'hexastral' NOT NULL,
	`type` text NOT NULL,
	`vlm_description` text,
	`interpretation` text,
	`bookmarked` integer DEFAULT false NOT NULL,
	`rating` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `physiognomy_user_created_idx` ON `physiognomy_readings` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `physiognomy_target_app_user_idx` ON `physiognomy_readings` (`target_app`,`user_id`);--> statement-breakpoint
CREATE TABLE `portfolio_readings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`target_app` text NOT NULL,
	`reading_type` text NOT NULL,
	`input_json` text NOT NULL,
	`result_json` text NOT NULL,
	`ddl_token` text,
	`locale` text DEFAULT 'en',
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `portfolio_readings_target_created_idx` ON `portfolio_readings` (`target_app`,`created_at`);--> statement-breakpoint
CREATE INDEX `portfolio_readings_user_target_created_idx` ON `portfolio_readings` (`user_id`,`target_app`,`created_at`);--> statement-breakpoint
CREATE INDEX `portfolio_readings_ddl_idx` ON `portfolio_readings` (`ddl_token`);--> statement-breakpoint
CREATE TABLE `push_tokens` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`platform` text DEFAULT 'ios' NOT NULL,
	`timezone_id` text NOT NULL,
	`last_active_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `pt_user_idx` ON `push_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `pt_timezone_idx` ON `push_tokens` (`timezone_id`);--> statement-breakpoint
CREATE TABLE `reading_gifts` (
	`id` text PRIMARY KEY NOT NULL,
	`sender_user_id` text NOT NULL,
	`recipient_email` text NOT NULL,
	`recipient_user_id` text,
	`reading_type` text NOT NULL,
	`reading_id` text NOT NULL,
	`recipient_name` text,
	`recipient_gender` text,
	`recipient_birth_solar` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`claimed_at` text,
	`snapshot_json` text,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`sender_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `rg_sender_idx` ON `reading_gifts` (`sender_user_id`);--> statement-breakpoint
CREATE INDEX `rg_recipient_email_status_idx` ON `reading_gifts` (`recipient_email`,`status`);--> statement-breakpoint
CREATE INDEX `rg_recipient_user_idx` ON `reading_gifts` (`recipient_user_id`);--> statement-breakpoint
CREATE TABLE `report_chapters` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`chapter` text NOT NULL,
	`chart_hash` text NOT NULL,
	`context_hash` text NOT NULL,
	`content_json` text NOT NULL,
	`locale` text NOT NULL,
	`explanation_mode` text NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`perspective_seed` text,
	`is_current` integer DEFAULT true NOT NULL,
	`generated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `rc_user_chapter_current_idx` ON `report_chapters` (`user_id`,`chapter`,`is_current`);--> statement-breakpoint
CREATE INDEX `rc_user_chapter_generated_idx` ON `report_chapters` (`user_id`,`chapter`,`generated_at`);--> statement-breakpoint
CREATE TABLE `shared_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`report_type` text NOT NULL,
	`report_id` text NOT NULL,
	`title_hint` text,
	`content_json` text NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text,
	`visibility` text DEFAULT 'private' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sr_user_created_idx` ON `shared_reports` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `single_purchases` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`sku_id` text NOT NULL,
	`rc_event_id` text NOT NULL,
	`product_id` text NOT NULL,
	`status` text DEFAULT 'purchased' NOT NULL,
	`reading_id` text,
	`created_at` text NOT NULL,
	`consumed_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `single_purchases_rc_event_id_unique` ON `single_purchases` (`rc_event_id`);--> statement-breakpoint
CREATE INDEX `sp_user_sku_status_idx` ON `single_purchases` (`user_id`,`sku_id`,`status`);--> statement-breakpoint
CREATE INDEX `sp_user_created_idx` ON `single_purchases` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `subscription_quotas` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`month` text NOT NULL,
	`pair_used` integer DEFAULT 0 NOT NULL,
	`divination_used` integer DEFAULT 0 NOT NULL,
	`divination_daily_used` integer DEFAULT 0 NOT NULL,
	`divination_daily_date` text,
	`chat_pool_used` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sq_user_month_idx` ON `subscription_quotas` (`user_id`,`month`);--> statement-breakpoint
CREATE UNIQUE INDEX `sq_user_month_uniq` ON `subscription_quotas` (`user_id`,`month`);--> statement-breakpoint
CREATE TABLE `user_bonds` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`target_user_id` text,
	`target_name` text NOT NULL,
	`relationship_label` text NOT NULL,
	`mode` text DEFAULT 'solo' NOT NULL,
	`hehun_reading_id` text,
	`invitation_id` text,
	`mirror_bond_id` text,
	`target_birth_solar_date` text,
	`target_birth_time_index` integer,
	`target_birth_gender` text,
	`target_birth_city` text,
	`target_phone_hash` text,
	`unlocked_dimensions` text,
	`shared_by_owner` integer DEFAULT false NOT NULL,
	`relationship_stage` text DEFAULT 'crush',
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hehun_reading_id`) REFERENCES `pair_readings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ub_owner_idx` ON `user_bonds` (`owner_id`);--> statement-breakpoint
CREATE INDEX `ub_owner_status_mode_idx` ON `user_bonds` (`owner_id`,`status`,`mode`);--> statement-breakpoint
CREATE INDEX `ub_target_idx` ON `user_bonds` (`target_user_id`);--> statement-breakpoint
CREATE INDEX `ub_invitation_idx` ON `user_bonds` (`invitation_id`);--> statement-breakpoint
CREATE TABLE `user_charts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`chart_type` text NOT NULL,
	`input_hash` text NOT NULL,
	`solar_date` text NOT NULL,
	`time_index` integer NOT NULL,
	`gender` text NOT NULL,
	`city` text,
	`longitude` text,
	`latitude` text,
	`timezone_id` text,
	`chart_data` text NOT NULL,
	`interpretation_free` text,
	`interpretation_pro` text,
	`interpretation_lang` text,
	`bookmarked` integer DEFAULT false NOT NULL,
	`rating` integer,
	`display_hints` text,
	`engine_version` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `uc_user_idx` ON `user_charts` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uc_user_chart_type_uniq` ON `user_charts` (`user_id`,`chart_type`);--> statement-breakpoint
CREATE TABLE `user_entitlements` (
	`user_id` text NOT NULL,
	`entitlement_key` text NOT NULL,
	`plan` text,
	`product_id` text,
	`activated_at` text NOT NULL,
	`expires_at` text,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `entitlement_key`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_entitlements_expires_idx` ON `user_entitlements` (`expires_at`);--> statement-breakpoint
CREATE TABLE `user_physiognomy_features` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text DEFAULT 'face' NOT NULL,
	`features_json` text NOT NULL,
	`vlm_narrative` text,
	`extraction_model` text NOT NULL,
	`image_deleted` integer DEFAULT false NOT NULL,
	`privacy_consent_version` text DEFAULT 'v1' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `upf_user_created_idx` ON `user_physiognomy_features` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `upf_user_model_idx` ON `user_physiognomy_features` (`user_id`,`extraction_model`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`name` text,
	`display_name` text,
	`apple_user_id` text,
	`google_user_id` text,
	`username` text,
	`avatar_key` text,
	`phone` text,
	`chart_public` integer DEFAULT false NOT NULL,
	`public_visibility_json` text,
	`fate_signature` text,
	`fate_signature_style` text DEFAULT 'classical',
	`fate_signature_custom_prompt` text,
	`fate_signature_generated_at` text,
	`fate_signature_explanation` text,
	`birth_solar_date` text,
	`birth_time_index` integer,
	`birth_gender` text,
	`birth_city` text,
	`birth_longitude` text,
	`birth_latitude` text,
	`birth_timezone_id` text,
	`hemisphere_reversal_enabled` integer DEFAULT false NOT NULL,
	`birth_calendar_type` text,
	`birth_lunar_date` text,
	`birth_is_leap_month` integer DEFAULT false,
	`active_physiognomy_id` text,
	`active_palm_feature_id` text,
	`subscription_status` text DEFAULT 'free' NOT NULL,
	`subscription_plan` text,
	`subscription_expires_at` text,
	`revenue_cat_user_id` text,
	`chat_credits_remaining` integer DEFAULT 0 NOT NULL,
	`divination_credits_remaining` integer DEFAULT 0 NOT NULL,
	`coincast_credits_remaining` integer DEFAULT 0 NOT NULL,
	`coincast_pro_expires_at` text,
	`coincast_consecutive_violations` integer DEFAULT 0 NOT NULL,
	`coincast_banned_until` text,
	`portfolio_memory_enabled` integer DEFAULT false NOT NULL,
	`free_chat_quota` integer DEFAULT 3 NOT NULL,
	`device_secret` text,
	`phone_hash` text,
	`locale` text DEFAULT 'zh',
	`tone_preference` text DEFAULT 'gentle',
	`notif_prefs_json` text,
	`day_master_stem` text,
	`day_master_strength` text,
	`favorable_element` text,
	`unfavorable_element` text,
	`ziwei_ming_palace_star` text,
	`birth_branch` text,
	`total_readings` integer DEFAULT 0 NOT NULL,
	`total_analyses` integer DEFAULT 0 NOT NULL,
	`total_divinations` integer DEFAULT 0 NOT NULL,
	`last_active_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_apple_user_id_unique` ON `users` (`apple_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_user_id_unique` ON `users` (`google_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `users_phone_hash_idx` ON `users` (`phone_hash`);