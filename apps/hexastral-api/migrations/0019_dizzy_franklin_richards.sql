-- floorplan columns only; production already has feng_reports.current_yuan (0000).
-- Drizzle snapshot drift incorrectly emitted RENAME current_kindred → current_yuan.
ALTER TABLE `feng_sites` ADD `floorplan_key` text;--> statement-breakpoint
ALTER TABLE `feng_sites` ADD `floorplan_json` text;
