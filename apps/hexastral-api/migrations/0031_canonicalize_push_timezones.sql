-- One-shot: map stored device IANA zones to TIMEZONE_POOL representatives
-- (packages/timezone-pool ALIAS_TO_POOL). New registers already canonicalize
-- in hexastral-api; this fixes rows that predate that write-path fix.
-- Offset-only fallbacks (rare zones not in the alias map) still need
-- client re-register; SQL cannot run Intl offset matching.
UPDATE `push_tokens`
SET `timezone_id` = CASE `timezone_id`
    WHEN 'Asia/Hong_Kong' THEN 'Asia/Shanghai'
    WHEN 'Asia/Macau' THEN 'Asia/Shanghai'
    WHEN 'Asia/Macao' THEN 'Asia/Shanghai'
    WHEN 'Asia/Singapore' THEN 'Asia/Shanghai'
    WHEN 'Asia/Taipei' THEN 'Asia/Shanghai'
    WHEN 'Asia/Manila' THEN 'Asia/Shanghai'
    WHEN 'Asia/Brunei' THEN 'Asia/Shanghai'
    WHEN 'Asia/Kuching' THEN 'Asia/Shanghai'
    WHEN 'Asia/Kuala_Lumpur' THEN 'Asia/Shanghai'
    WHEN 'Asia/Chongqing' THEN 'Asia/Shanghai'
    WHEN 'Asia/Harbin' THEN 'Asia/Shanghai'
    WHEN 'Asia/Urumqi' THEN 'Asia/Shanghai'
    WHEN 'Australia/Perth' THEN 'Asia/Shanghai'
    WHEN 'Asia/Seoul' THEN 'Asia/Tokyo'
    WHEN 'Asia/Pyongyang' THEN 'Asia/Tokyo'
    WHEN 'Asia/Jayapura' THEN 'Asia/Tokyo'
    WHEN 'Europe/Berlin' THEN 'Europe/Paris'
    WHEN 'Europe/Amsterdam' THEN 'Europe/Paris'
    WHEN 'Europe/Brussels' THEN 'Europe/Paris'
    WHEN 'Europe/Madrid' THEN 'Europe/Paris'
    WHEN 'Europe/Rome' THEN 'Europe/Paris'
    WHEN 'Europe/Vienna' THEN 'Europe/Paris'
    WHEN 'Europe/Warsaw' THEN 'Europe/Paris'
    WHEN 'Europe/Prague' THEN 'Europe/Paris'
    WHEN 'Europe/Zurich' THEN 'Europe/Paris'
    WHEN 'Europe/Stockholm' THEN 'Europe/Paris'
    WHEN 'Europe/Oslo' THEN 'Europe/Paris'
    WHEN 'Europe/Copenhagen' THEN 'Europe/Paris'
    WHEN 'Europe/Budapest' THEN 'Europe/Paris'
    WHEN 'Africa/Lagos' THEN 'Europe/Paris'
    WHEN 'UTC' THEN 'Europe/London'
    WHEN 'Etc/UTC' THEN 'Europe/London'
    WHEN 'Etc/GMT' THEN 'Europe/London'
    WHEN 'Europe/Dublin' THEN 'Europe/London'
    WHEN 'Europe/Lisbon' THEN 'Europe/London'
    WHEN 'Atlantic/Reykjavik' THEN 'Europe/London'
    WHEN 'Africa/Abidjan' THEN 'Europe/London'
    WHEN 'America/Toronto' THEN 'America/New_York'
    WHEN 'America/Montreal' THEN 'America/New_York'
    WHEN 'America/Detroit' THEN 'America/New_York'
    WHEN 'America/Indiana/Indianapolis' THEN 'America/New_York'
    WHEN 'America/Mexico_City' THEN 'America/Chicago'
    WHEN 'America/Winnipeg' THEN 'America/Chicago'
    WHEN 'America/Phoenix' THEN 'America/Denver'
    WHEN 'America/Edmonton' THEN 'America/Denver'
    WHEN 'America/Vancouver' THEN 'America/Los_Angeles'
    WHEN 'America/Tijuana' THEN 'America/Los_Angeles'
    WHEN 'Australia/Melbourne' THEN 'Australia/Sydney'
    WHEN 'Australia/Brisbane' THEN 'Australia/Sydney'
    WHEN 'Australia/Hobart' THEN 'Australia/Sydney'
    WHEN 'Asia/Jakarta' THEN 'Asia/Bangkok'
    WHEN 'Asia/Ho_Chi_Minh' THEN 'Asia/Bangkok'
    WHEN 'Asia/Saigon' THEN 'Asia/Bangkok'
    WHEN 'Asia/Phnom_Penh' THEN 'Asia/Bangkok'
    WHEN 'Asia/Vientiane' THEN 'Asia/Bangkok'
    ELSE `timezone_id`
  END
WHERE `timezone_id` IN (
  'Asia/Hong_Kong', 'Asia/Macau', 'Asia/Macao', 'Asia/Singapore', 'Asia/Taipei',
  'Asia/Manila', 'Asia/Brunei', 'Asia/Kuching', 'Asia/Kuala_Lumpur',
  'Asia/Chongqing', 'Asia/Harbin', 'Asia/Urumqi', 'Australia/Perth',
  'Asia/Seoul', 'Asia/Pyongyang', 'Asia/Jayapura',
  'Europe/Berlin', 'Europe/Amsterdam', 'Europe/Brussels', 'Europe/Madrid',
  'Europe/Rome', 'Europe/Vienna', 'Europe/Warsaw', 'Europe/Prague',
  'Europe/Zurich', 'Europe/Stockholm', 'Europe/Oslo', 'Europe/Copenhagen',
  'Europe/Budapest', 'Africa/Lagos',
  'UTC', 'Etc/UTC', 'Etc/GMT', 'Europe/Dublin', 'Europe/Lisbon',
  'Atlantic/Reykjavik', 'Africa/Abidjan',
  'America/Toronto', 'America/Montreal', 'America/Detroit',
  'America/Indiana/Indianapolis', 'America/Mexico_City', 'America/Winnipeg',
  'America/Phoenix', 'America/Edmonton', 'America/Vancouver', 'America/Tijuana',
  'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Hobart',
  'Asia/Jakarta', 'Asia/Ho_Chi_Minh', 'Asia/Saigon', 'Asia/Phnom_Penh',
  'Asia/Vientiane'
);
--> statement-breakpoint
UPDATE `auspice_push_subs`
SET `timezone_id` = CASE `timezone_id`
    WHEN 'Asia/Hong_Kong' THEN 'Asia/Shanghai'
    WHEN 'Asia/Macau' THEN 'Asia/Shanghai'
    WHEN 'Asia/Macao' THEN 'Asia/Shanghai'
    WHEN 'Asia/Singapore' THEN 'Asia/Shanghai'
    WHEN 'Asia/Taipei' THEN 'Asia/Shanghai'
    WHEN 'Asia/Manila' THEN 'Asia/Shanghai'
    WHEN 'Asia/Brunei' THEN 'Asia/Shanghai'
    WHEN 'Asia/Kuching' THEN 'Asia/Shanghai'
    WHEN 'Asia/Kuala_Lumpur' THEN 'Asia/Shanghai'
    WHEN 'Asia/Chongqing' THEN 'Asia/Shanghai'
    WHEN 'Asia/Harbin' THEN 'Asia/Shanghai'
    WHEN 'Asia/Urumqi' THEN 'Asia/Shanghai'
    WHEN 'Australia/Perth' THEN 'Asia/Shanghai'
    WHEN 'Asia/Seoul' THEN 'Asia/Tokyo'
    WHEN 'Asia/Pyongyang' THEN 'Asia/Tokyo'
    WHEN 'Asia/Jayapura' THEN 'Asia/Tokyo'
    WHEN 'Europe/Berlin' THEN 'Europe/Paris'
    WHEN 'Europe/Amsterdam' THEN 'Europe/Paris'
    WHEN 'Europe/Brussels' THEN 'Europe/Paris'
    WHEN 'Europe/Madrid' THEN 'Europe/Paris'
    WHEN 'Europe/Rome' THEN 'Europe/Paris'
    WHEN 'Europe/Vienna' THEN 'Europe/Paris'
    WHEN 'Europe/Warsaw' THEN 'Europe/Paris'
    WHEN 'Europe/Prague' THEN 'Europe/Paris'
    WHEN 'Europe/Zurich' THEN 'Europe/Paris'
    WHEN 'Europe/Stockholm' THEN 'Europe/Paris'
    WHEN 'Europe/Oslo' THEN 'Europe/Paris'
    WHEN 'Europe/Copenhagen' THEN 'Europe/Paris'
    WHEN 'Europe/Budapest' THEN 'Europe/Paris'
    WHEN 'Africa/Lagos' THEN 'Europe/Paris'
    WHEN 'UTC' THEN 'Europe/London'
    WHEN 'Etc/UTC' THEN 'Europe/London'
    WHEN 'Etc/GMT' THEN 'Europe/London'
    WHEN 'Europe/Dublin' THEN 'Europe/London'
    WHEN 'Europe/Lisbon' THEN 'Europe/London'
    WHEN 'Atlantic/Reykjavik' THEN 'Europe/London'
    WHEN 'Africa/Abidjan' THEN 'Europe/London'
    WHEN 'America/Toronto' THEN 'America/New_York'
    WHEN 'America/Montreal' THEN 'America/New_York'
    WHEN 'America/Detroit' THEN 'America/New_York'
    WHEN 'America/Indiana/Indianapolis' THEN 'America/New_York'
    WHEN 'America/Mexico_City' THEN 'America/Chicago'
    WHEN 'America/Winnipeg' THEN 'America/Chicago'
    WHEN 'America/Phoenix' THEN 'America/Denver'
    WHEN 'America/Edmonton' THEN 'America/Denver'
    WHEN 'America/Vancouver' THEN 'America/Los_Angeles'
    WHEN 'America/Tijuana' THEN 'America/Los_Angeles'
    WHEN 'Australia/Melbourne' THEN 'Australia/Sydney'
    WHEN 'Australia/Brisbane' THEN 'Australia/Sydney'
    WHEN 'Australia/Hobart' THEN 'Australia/Sydney'
    WHEN 'Asia/Jakarta' THEN 'Asia/Bangkok'
    WHEN 'Asia/Ho_Chi_Minh' THEN 'Asia/Bangkok'
    WHEN 'Asia/Saigon' THEN 'Asia/Bangkok'
    WHEN 'Asia/Phnom_Penh' THEN 'Asia/Bangkok'
    WHEN 'Asia/Vientiane' THEN 'Asia/Bangkok'
    ELSE `timezone_id`
  END
WHERE `timezone_id` IN (
  'Asia/Hong_Kong', 'Asia/Macau', 'Asia/Macao', 'Asia/Singapore', 'Asia/Taipei',
  'Asia/Manila', 'Asia/Brunei', 'Asia/Kuching', 'Asia/Kuala_Lumpur',
  'Asia/Chongqing', 'Asia/Harbin', 'Asia/Urumqi', 'Australia/Perth',
  'Asia/Seoul', 'Asia/Pyongyang', 'Asia/Jayapura',
  'Europe/Berlin', 'Europe/Amsterdam', 'Europe/Brussels', 'Europe/Madrid',
  'Europe/Rome', 'Europe/Vienna', 'Europe/Warsaw', 'Europe/Prague',
  'Europe/Zurich', 'Europe/Stockholm', 'Europe/Oslo', 'Europe/Copenhagen',
  'Europe/Budapest', 'Africa/Lagos',
  'UTC', 'Etc/UTC', 'Etc/GMT', 'Europe/Dublin', 'Europe/Lisbon',
  'Atlantic/Reykjavik', 'Africa/Abidjan',
  'America/Toronto', 'America/Montreal', 'America/Detroit',
  'America/Indiana/Indianapolis', 'America/Mexico_City', 'America/Winnipeg',
  'America/Phoenix', 'America/Edmonton', 'America/Vancouver', 'America/Tijuana',
  'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Hobart',
  'Asia/Jakarta', 'Asia/Ho_Chi_Minh', 'Asia/Saigon', 'Asia/Phnom_Penh',
  'Asia/Vientiane'
);
--> statement-breakpoint
UPDATE `faceoracle_push_subs`
SET `timezone_id` = CASE `timezone_id`
    WHEN 'Asia/Hong_Kong' THEN 'Asia/Shanghai'
    WHEN 'Asia/Macau' THEN 'Asia/Shanghai'
    WHEN 'Asia/Macao' THEN 'Asia/Shanghai'
    WHEN 'Asia/Singapore' THEN 'Asia/Shanghai'
    WHEN 'Asia/Taipei' THEN 'Asia/Shanghai'
    WHEN 'Asia/Manila' THEN 'Asia/Shanghai'
    WHEN 'Asia/Brunei' THEN 'Asia/Shanghai'
    WHEN 'Asia/Kuching' THEN 'Asia/Shanghai'
    WHEN 'Asia/Kuala_Lumpur' THEN 'Asia/Shanghai'
    WHEN 'Asia/Chongqing' THEN 'Asia/Shanghai'
    WHEN 'Asia/Harbin' THEN 'Asia/Shanghai'
    WHEN 'Asia/Urumqi' THEN 'Asia/Shanghai'
    WHEN 'Australia/Perth' THEN 'Asia/Shanghai'
    WHEN 'Asia/Seoul' THEN 'Asia/Tokyo'
    WHEN 'Asia/Pyongyang' THEN 'Asia/Tokyo'
    WHEN 'Asia/Jayapura' THEN 'Asia/Tokyo'
    WHEN 'Europe/Berlin' THEN 'Europe/Paris'
    WHEN 'Europe/Amsterdam' THEN 'Europe/Paris'
    WHEN 'Europe/Brussels' THEN 'Europe/Paris'
    WHEN 'Europe/Madrid' THEN 'Europe/Paris'
    WHEN 'Europe/Rome' THEN 'Europe/Paris'
    WHEN 'Europe/Vienna' THEN 'Europe/Paris'
    WHEN 'Europe/Warsaw' THEN 'Europe/Paris'
    WHEN 'Europe/Prague' THEN 'Europe/Paris'
    WHEN 'Europe/Zurich' THEN 'Europe/Paris'
    WHEN 'Europe/Stockholm' THEN 'Europe/Paris'
    WHEN 'Europe/Oslo' THEN 'Europe/Paris'
    WHEN 'Europe/Copenhagen' THEN 'Europe/Paris'
    WHEN 'Europe/Budapest' THEN 'Europe/Paris'
    WHEN 'Africa/Lagos' THEN 'Europe/Paris'
    WHEN 'UTC' THEN 'Europe/London'
    WHEN 'Etc/UTC' THEN 'Europe/London'
    WHEN 'Etc/GMT' THEN 'Europe/London'
    WHEN 'Europe/Dublin' THEN 'Europe/London'
    WHEN 'Europe/Lisbon' THEN 'Europe/London'
    WHEN 'Atlantic/Reykjavik' THEN 'Europe/London'
    WHEN 'Africa/Abidjan' THEN 'Europe/London'
    WHEN 'America/Toronto' THEN 'America/New_York'
    WHEN 'America/Montreal' THEN 'America/New_York'
    WHEN 'America/Detroit' THEN 'America/New_York'
    WHEN 'America/Indiana/Indianapolis' THEN 'America/New_York'
    WHEN 'America/Mexico_City' THEN 'America/Chicago'
    WHEN 'America/Winnipeg' THEN 'America/Chicago'
    WHEN 'America/Phoenix' THEN 'America/Denver'
    WHEN 'America/Edmonton' THEN 'America/Denver'
    WHEN 'America/Vancouver' THEN 'America/Los_Angeles'
    WHEN 'America/Tijuana' THEN 'America/Los_Angeles'
    WHEN 'Australia/Melbourne' THEN 'Australia/Sydney'
    WHEN 'Australia/Brisbane' THEN 'Australia/Sydney'
    WHEN 'Australia/Hobart' THEN 'Australia/Sydney'
    WHEN 'Asia/Jakarta' THEN 'Asia/Bangkok'
    WHEN 'Asia/Ho_Chi_Minh' THEN 'Asia/Bangkok'
    WHEN 'Asia/Saigon' THEN 'Asia/Bangkok'
    WHEN 'Asia/Phnom_Penh' THEN 'Asia/Bangkok'
    WHEN 'Asia/Vientiane' THEN 'Asia/Bangkok'
    ELSE `timezone_id`
  END
WHERE `timezone_id` IN (
  'Asia/Hong_Kong', 'Asia/Macau', 'Asia/Macao', 'Asia/Singapore', 'Asia/Taipei',
  'Asia/Manila', 'Asia/Brunei', 'Asia/Kuching', 'Asia/Kuala_Lumpur',
  'Asia/Chongqing', 'Asia/Harbin', 'Asia/Urumqi', 'Australia/Perth',
  'Asia/Seoul', 'Asia/Pyongyang', 'Asia/Jayapura',
  'Europe/Berlin', 'Europe/Amsterdam', 'Europe/Brussels', 'Europe/Madrid',
  'Europe/Rome', 'Europe/Vienna', 'Europe/Warsaw', 'Europe/Prague',
  'Europe/Zurich', 'Europe/Stockholm', 'Europe/Oslo', 'Europe/Copenhagen',
  'Europe/Budapest', 'Africa/Lagos',
  'UTC', 'Etc/UTC', 'Etc/GMT', 'Europe/Dublin', 'Europe/Lisbon',
  'Atlantic/Reykjavik', 'Africa/Abidjan',
  'America/Toronto', 'America/Montreal', 'America/Detroit',
  'America/Indiana/Indianapolis', 'America/Mexico_City', 'America/Winnipeg',
  'America/Phoenix', 'America/Edmonton', 'America/Vancouver', 'America/Tijuana',
  'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Hobart',
  'Asia/Jakarta', 'Asia/Ho_Chi_Minh', 'Asia/Saigon', 'Asia/Phnom_Penh',
  'Asia/Vientiane'
);
