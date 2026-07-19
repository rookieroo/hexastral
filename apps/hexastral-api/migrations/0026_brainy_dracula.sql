ALTER TABLE `user_physiognomy_features` ADD `content_hash` text;--> statement-breakpoint
ALTER TABLE `user_physiognomy_features` ADD `schema_version` text DEFAULT 'xingqi-vlm-v1' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `upf_user_type_hash_model_schema_uniq` ON `user_physiognomy_features` (`user_id`,`type`,`content_hash`,`extraction_model`,`schema_version`);