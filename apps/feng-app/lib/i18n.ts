/**
 * Fēng app i18n — 4-locale registry (en / zh-Hans / zh-Hant / ja).
 *
 * Translation responsibility per feng-plan §2:
 *   - en is source of truth
 *   - zh-Hant translated by domain-fluent contributor
 *   - zh-Hans derived from zh-Hant via OpenCC (not yet wired — currently
 *     hand-written subset)
 *   - ja is a re-write, not a translation; Week 5 ships native reviewer pass
 */

import { getLocales } from 'expo-localization'

export type Locale = 'en' | 'zh' | 'zh-Hant' | 'ja'
export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'zh', 'zh-Hant', 'ja']

export function resolveLocale(): Locale {
  const locales = getLocales()
  const first = locales[0]
  if (!first) return 'en'
  const tag = first.languageTag.toLowerCase()
  if (tag.startsWith('zh-tw') || tag.startsWith('zh-hk') || tag.startsWith('zh-hant')) {
    return 'zh-Hant'
  }
  if (tag.startsWith('zh')) return 'zh'
  if (tag.startsWith('ja')) return 'ja'
  return 'en'
}

export type Strings = {
  appName: string

  // Boot / empty state
  empty_title: string
  empty_subtitle: string
  empty_cta: string

  // New-site flow
  new_site_address_title: string
  new_site_address_subtitle: string
  new_site_address_placeholder: string
  new_site_address_name_placeholder: string
  new_site_default_name: string
  new_site_address_geocode_error: string
  new_site_address_geocoding: string
  new_site_address_name_label: string
  new_site_address_field_label: string
  new_site_address_use_location: string

  new_site_facing_title: string
  new_site_facing_subtitle: string
  new_site_facing_map_legend: string
  new_site_facing_edit_building: string
  new_site_facing_edit_unit_door: string
  new_site_facing_capture_hint: string
  new_site_facing_capture_building: string
  new_site_facing_capture_unit_door: string
  new_site_facing_value: string
  new_site_facing_door_toggle: string
  new_site_facing_door_value: string
  new_site_facing_tile_loading: string
  new_site_facing_tile_error: string
  new_site_facing_tile_retry: string
  new_site_facing_next: string

  new_site_building_title: string
  new_site_building_year_label: string
  new_site_building_moveIn_label: string
  new_site_building_year_accuracy: string
  new_site_building_accuracy_exact: string
  new_site_building_accuracy_decade: string
  new_site_building_accuracy_moveIn: string
  new_site_building_accuracy_unknown: string
  new_site_building_floor_label: string
  new_site_building_next: string

  new_site_review_title: string
  new_site_review_address: string
  new_site_review_building_facing: string
  new_site_review_unit_door: string
  new_site_review_buildYear: string
  new_site_review_confirm: string
  new_site_review_processing: string

  // Tabs
  tab_sites: string
  tab_compass: string
  tab_readings: string
  tab_profile: string

  // Compass tab
  compass_heading_title: string
  compass_no_permission: string

  // Readings tab
  readings_updated: string

  // Report screen
  report_loading: string
  report_failed: string
  report_pending: string
  /** Tag over the two-phase report shell (computed content, chapters still generating). */
  report_shell_tag: string
  report_chapter_pager_hint: string
  report_data_quality_footer: string
  /** Confidence note: 理气 deterministic vs 形势 AI/DEM-inferred. */
  report_confidence_note: string
  report_legal_disclaimer: string
  /** One-line disclaimer at the bottom of each report chapter page. */
  report_chapter_micro_disclaimer: string
  report_map_close: string
  report_map_mid: string
  report_map_wide: string
  report_map_loading: string
  report_map_failed: string
  /** Shown under the 飞星 chart when the facing is 兼向 (replacement-star chart). */
  report_compound_facing_note: string
  /** Heading above the per-palace 形理 (form-li) verdict list. */
  report_formli_heading: string
  /** 床灶门书桌吉位 block. */
  report_placement_heading: string
  /** Report digest cover — qualitative summary (no percentile score). */
  report_digest_tag: string
  digest_chart_line: string
  digest_pattern_ping: string
  digest_pattern_rescued: string
  digest_pattern_unrescued: string
  digest_concord_matched: string
  digest_concord_mismatched: string
  digest_exterior_clean: string
  digest_exterior_sha_light: string
  digest_exterior_sha: string
  digest_confidence_medium: string
  digest_confidence_low: string
  digest_headline_pattern_rescued: string
  digest_headline_pattern_unrescued: string
  digest_headline_focus: string
  digest_headline_exterior_sha: string
  digest_headline_concord_mismatch: string
  digest_headline_ping: string
  digest_focus_line: string
  digest_not_score: string
  /** Footer on shared chapter PNG cards. */
  share_brand_footer: string
  share_disclaimer: string
  reading_copy: string
  reading_chat: string
  reading_highlight: string
  term_source: string
  term_ask: string
  tool_glossary: string
  glossary_intro: string
  placement_door: string
  placement_bed: string
  placement_stove: string
  placement_desk: string
  /** Short chapter tags rendered next to the "CH n" pill. */
  chapter_external_landform: string
  chapter_personal_fit: string
  chapter_flying_stars: string
  chapter_annual_directions: string
  chapter_remediation: string
  chapter_auspicious_objects: string
  /** Plain-language "how to read the 飞星 plate" note under the chart. */
  flying_stars_explainer: string
  nav_back: string
  /** AI / VLM processing notice rendered above the "Generate report" button. */
  new_site_review_ai_disclaimer: string
  /** One-time IAP / Pro cost note rendered next to the AI disclaimer. */
  new_site_review_iap_note: string
  new_site_review_birth_title: string
  new_site_review_birth_add: string
  new_site_review_birth_none: string
  new_site_review_birth_have: string
  new_site_birth_title: string
  new_site_birth_desc_have: string
  new_site_birth_desc_none: string
  new_site_birth_edit: string
  new_site_birth_add: string
  new_site_birth_continue: string
  new_site_birth_skip: string
  // ── 户型图 / floor plan (interior 堪舆) step ──
  new_site_floorplan_title: string
  new_site_floorplan_desc: string
  new_site_floorplan_permission: string
  new_site_floorplan_north_label: string
  new_site_floorplan_north_reset: string
  new_site_floorplan_add: string
  new_site_floorplan_continue: string
  new_site_floorplan_skip: string
  new_site_floorplan_count_one: string
  new_site_floorplan_count_villa: string
  /** Shown when the {n}-image upload cap is reached ({n} = MAX_FLOORPLAN_IMAGES). */
  new_site_floorplan_max: string
  new_site_floorplan_grid_show: string
  new_site_floorplan_grid_hide: string
  new_site_review_floorplan: string
  report_unlock_title: string

  // Paywall
  paywall_title: string
  paywall_subtitle_analyze: string
  paywall_subtitle_chat: string
  paywall_plan_single: string
  paywall_cta: string
  paywall_success: string
  paywall_restore: string
  paywall_failed: string
  paywall_unavailable: string
  paywall_bullet_report: string
  paywall_bullet_chat: string
  paywall_bullet_once: string
  paywall_legal_disclaimer: string
  chat_legal_disclaimer: string
  new_site_review_no_floorplan: string
  new_site_review_analyze_eta: string
  new_site_review_error_paywall: string
  new_site_review_error_network: string

  // Sign-in
  sign_in_hint: string
  sign_in_google: string
  sign_in_guest: string

  // Account kinds (profile header)
  account_kind_apple: string
  account_kind_google: string
  account_kind_guest: string
  account_kind_device: string

  // Profile tab
  profile_birth_section: string
  profile_birth_required: string
  profile_birth_required_cta: string
  profile_birth_edit_cta: string
  profile_sign_out: string
  profile_sign_out_confirm: string
  profile_delete_account: string
  profile_delete_confirm_title: string
  profile_delete_confirm_body: string
  profile_delete_confirm_cta: string
  profile_delete_failed: string
  cancel: string

  // Birth info screen
  birth_info_title: string
  birth_info_subtitle: string
  birth_date_label: string
  birth_calendar_solar: string
  birth_calendar_lunar: string
  birth_calendar_lunar_hint: string
  birth_time_label: string
  birth_time_unknown: string
  birth_gender_label: string
  birth_gender_male: string
  birth_gender_female: string
  birth_city_label: string
  birth_city_placeholder: string
  birth_city_required: string
  birth_save: string
  birth_saved: string
  birth_saving: string
  birth_hint: string

  // Share
  share_chapter: string
  share_pending: string
  share_needs_signin: string

  // Errors
  err_generic: string

  // Reading chat (Pro AI follow-up over a report)
  chat_title: string
  chat_empty: string
  chat_placeholder: string
  chat_loading: string
  chat_error: string
  chat_pro_unlimited: string
  chat_buy_credits: string
  chat_free_remaining: string
  chat_pool_remaining: string
  chat_pro_required: string
  chat_cta: string
  chat_suggest_1: string
  chat_suggest_2: string
  chat_suggest_3: string
  chat_report: string
  chat_report_confirm_title: string
  chat_report_confirm_body: string
  chat_report_done: string

  // Privacy (cross-app memory)
  privacy_section: string
  cross_app_memory_label: string
  cross_app_memory_hint: string
}

const EN: Strings = {
  appName: 'Fēng',
  empty_title: 'No sites yet',
  empty_subtitle: 'Add a home or office to explore classical site theory from satellite and layout inputs.',
  empty_cta: 'Add a site',
  new_site_address_title: 'Pick your address',
  new_site_address_subtitle: 'Type an address or use your current location.',
  new_site_address_placeholder: 'Street, city, country',
  new_site_address_name_placeholder: "Home / Office / Parents'",
  new_site_default_name: 'My site',
  new_site_address_geocode_error:
    'Could not find coordinates for this address. Try "Use current location" or refine the address.',
  new_site_address_geocoding: 'Looking up location…',
  new_site_address_name_label: 'Name',
  new_site_address_field_label: 'Address',
  new_site_address_use_location: 'Use current location',
  new_site_facing_title: 'Confirm facing direction',
  new_site_facing_subtitle:
    'Map is true north (N on the ring). Drag the highlighted arrow, or use Record while aiming your phone.',
  new_site_facing_map_legend:
    'Gold = building door · Blue = unit door · White = phone (outdoors only; may drift indoors) · N on ring = true north',
  new_site_facing_edit_building: 'Edit building door',
  new_site_facing_edit_unit_door: 'Edit unit door',
  new_site_facing_capture_hint: 'Stand outdoors, hold the phone flat, point at the door, then tap:',
  new_site_facing_capture_building: 'Record building door',
  new_site_facing_capture_unit_door: 'Record unit door',
  new_site_facing_value: 'Building {deg}°',
  new_site_facing_door_toggle: 'Unit door differs (apartments)',
  new_site_facing_door_value: 'Unit {deg}°',
  new_site_facing_tile_loading: 'Loading map…',
  new_site_facing_tile_error: 'Map unavailable — use Record with your phone aimed at the door.',
  new_site_facing_tile_retry: 'Retry map',
  new_site_facing_next: 'Next',
  new_site_building_title: 'About your building',
  new_site_building_year_label: 'Year built',
  new_site_building_moveIn_label: 'Move-in year',
  new_site_building_year_accuracy: 'How sure are you?',
  new_site_building_accuracy_exact: 'Exact',
  new_site_building_accuracy_decade: 'Decade',
  new_site_building_accuracy_moveIn: 'Move-in year only',
  new_site_building_accuracy_unknown: 'Skip',
  new_site_building_floor_label: 'Floor (optional)',
  new_site_building_next: 'Continue',
  new_site_review_title: 'Review',
  new_site_review_address: 'Address',
  new_site_review_building_facing: 'Building entrance',
  new_site_review_unit_door: 'Unit door',
  new_site_review_buildYear: 'Build year',
  new_site_review_confirm: 'Generate report',
  new_site_review_processing: 'Analyzing… {stage}',
  tab_sites: 'Sites',
  tab_compass: 'Compass',
  tab_readings: 'Readings',
  tab_profile: 'Profile',
  compass_heading_title: 'Heading',
  compass_no_permission: 'Location permission is required to compute true north.',
  readings_updated: 'Updated {date}',
  report_loading: 'Loading report…',
  report_failed: 'Analysis failed: {message}',
  report_pending: 'Analysis pending — tap a site to generate a report.',
  report_shell_tag: 'Report overview · generating',
  report_chapter_pager_hint: 'Swipe to read each chapter.',
  report_data_quality_footer:
    'Some inputs were estimated. You can re-run with better data anytime.',
  report_confidence_note:
    'Flying-star and Eight-Mansion chapters are calculated from your inputs; landform notes are AI-inferred and for reference only.',
  report_legal_disclaimer:
    'For entertainment, cultural exploration, and personal reflection only — not professional feng-shui, architectural, or construction advice. Do not rely on this report for purchase, renovation, or safety decisions.',
  report_chapter_micro_disclaimer:
    'For entertainment and cultural study only — not construction, medical, financial, or life-decision advice.',
  report_map_close: 'Close-up',
  report_map_mid: 'Surrounding',
  report_map_wide: 'Wide',
  report_map_loading: 'Rendering map…',
  report_map_failed: 'Map unavailable',
  report_compound_facing_note:
    'Compound facing (兼向) — shown using the replacement-star (替卦) chart.',
  report_formli_heading: 'FORM × STARS (山水合参)',
  report_placement_heading: 'CLASSICAL PLACEMENT NOTES',
  report_digest_tag: 'Overview',
  digest_chart_line: 'Sit {sit} · Face {face} · built in Period {buildYuan} ({method}) · read in Period {currentYuan}',
  digest_pattern_ping: 'Balanced chart',
  digest_pattern_rescued: '{pattern} · rescued',
  digest_pattern_unrescued: '{pattern} · needs remedy',
  digest_concord_matched: 'House–person fit',
  digest_concord_mismatched: 'House–person clash',
  digest_exterior_clean: 'Clean exterior',
  digest_exterior_sha_light: '{count} form clash(es)',
  digest_exterior_sha: '{count} form clashes',
  digest_confidence_medium: 'Stars · medium confidence',
  digest_confidence_low: 'Stars · low confidence',
  digest_headline_pattern_rescued: '{pattern} is rescued by the surrounding landform — a classical form–star alignment reference.',
  digest_headline_pattern_unrescued: '{pattern} is not rescued by the landform — prioritize the remediation chapter.',
  digest_headline_focus: '{palace} palace reads {verdict} — start adjustments there.',
  digest_headline_exterior_sha: '{count} exterior form clashes need attention before interior tuning.',
  digest_headline_concord_mismatch: 'House and personal gua disagree — bed, door, and stove placement matter more here.',
  digest_headline_ping: 'No special flying-star disposition — read sector by sector from the form–star verdicts.',
  digest_focus_line: '{palace} · {verdict}',
  digest_not_score: 'Verdict chips from deterministic charts and landform — not a fortune score or percentile.',
  share_brand_footer: '風 · Kanyu',
  share_disclaimer: 'For entertainment and cultural study only — not professional advice.',
  reading_copy: 'Copy',
  reading_chat: 'Ask AI',
  reading_highlight: 'Highlight',
  term_source: 'Source',
  term_ask: 'Ask AI about this term',
  tool_glossary: 'Glossary',
  glossary_intro: 'The 风水 terms used across your reports, grouped by school.',
  placement_door: 'Main door',
  placement_bed: 'Bed (head)',
  placement_stove: 'Stove',
  placement_desk: 'Desk',
  chapter_external_landform: 'Landform',
  chapter_personal_fit: 'Trigram',
  chapter_flying_stars: 'Stars',
  chapter_annual_directions: 'Annual',
  chapter_remediation: 'Mitigation (study)',
  chapter_auspicious_objects: 'Placement (study)',
  flying_stars_explainer:
    'Each cell is one of the home’s nine directions. Top-left is the Mountain star (classical reading: people, health, relationships); top-right is the Facing star (classical reading: resources). The faint large number is the Period star; the bottom row shows the trigram and this year’s annual star. Bright numbers read as thriving, dim as weak, and red marks a sector to note in study — not a mandate to “remedy” or change your home.',
  nav_back: 'Back',
  new_site_review_ai_disclaimer:
    'We render annotated satellite tiles and run AI vision over them to identify 形煞 / 砂 / 水. Imagery is processed once and not stored after the report is built. For entertainment, cultural exploration, and personal reflection only — not professional feng-shui, architectural, or construction advice. Verify facing, build year, and floor-plan inputs yourself.',
  new_site_review_iap_note: 'One report per site, unlocked with a one-time purchase.',
  new_site_review_birth_title: 'Personal Trigram Chapter',
  new_site_review_birth_add: 'Add birth info',
  new_site_review_birth_none:
    'No birth info: the report will have 5 chapters (no Personal Trigram Fit). Add birth info to unlock the 6th.',
  new_site_review_birth_have: 'Birth info added · a Personal Trigram Fit chapter will be included.',
  new_site_birth_title: 'Personal Trigram',
  new_site_birth_desc_have:
    'Using your saved birth info — the report will include the Personal Trigram Fit chapter.',
  new_site_birth_desc_none:
    'The Personal Trigram Fit (八宅) chapter needs your birth year and gender. Set it now, or skip for a 5-chapter report.',
  new_site_birth_edit: 'Edit birth info',
  new_site_birth_add: 'Set birth info',
  new_site_birth_continue: 'Continue',
  new_site_birth_skip: 'Skip (5-chapter report)',
  new_site_floorplan_title: 'Floor plan (optional)',
  new_site_floorplan_desc:
    'Upload your floor plan for room-level analysis — one image for an apartment, or several for a villa / multi-floor home. Align the plan to true north below. GPS and metadata are stripped on upload.',
  new_site_floorplan_permission:
    'Photo access is needed to pick a floor plan. Enable it in Settings.',
  new_site_floorplan_north_label: 'ALIGN TO NORTH',
  new_site_floorplan_north_reset: 'Reset north',
  new_site_floorplan_add: 'Add floor plan',
  new_site_floorplan_continue: 'Continue',
  new_site_floorplan_skip: 'Skip (exterior-only report)',
  new_site_floorplan_count_one: '1 image · apartment',
  new_site_floorplan_count_villa: '{n} images · villa / multi-floor',
  new_site_floorplan_max: 'Maximum {n} floor plans reached.',
  new_site_floorplan_grid_show: 'Show nine-palace grid',
  new_site_floorplan_grid_hide: 'Hide nine-palace grid',
  new_site_review_floorplan: 'Floor plan',
  report_unlock_title: 'Unlock this report',
  paywall_title: 'Full site report',
  paywall_subtitle_analyze:
    'One purchase unlocks a structured site report for this address — satellite context, flying stars, and AI-written chapters (study tool).',
  paywall_subtitle_chat:
    'Purchase includes unlimited AI follow-up questions about this report.',
  paywall_plan_single: 'Site analysis',
  paywall_cta: 'Purchase report',
  paywall_success: 'Unlocked — generating your report…',
  paywall_restore: 'Restore purchases',
  paywall_failed: 'Purchase failed. Please try again.',
  paywall_unavailable: 'Purchases unavailable in this build.',
  paywall_bullet_report: 'Annotated satellite tiles + deterministic 玄空 / 八宅 compute',
  paywall_bullet_chat: 'Unlimited AI chat about this report',
  paywall_bullet_once: 'One-time purchase per report — no subscription',
  paywall_legal_disclaimer:
    'For entertainment and cultural exploration only — not a substitute for on-site inspection or licensed professionals. Report + chat may be inaccurate. See kanyu.hexastral.com/terms and kanyu.hexastral.com/privacy/feng.',
  new_site_review_no_floorplan: 'No floor plan — exterior / facing only',
  new_site_review_analyze_eta: 'Analysis usually takes 1–3 minutes.',
  new_site_review_error_paywall: 'A one-time purchase or Pro subscription is required.',
  new_site_review_error_network: 'Network error — check your connection and retry.',
  sign_in_hint: 'Sign in to save sites and readings across devices.',
  sign_in_google: 'Continue with Google',
  sign_in_guest: 'Continue as guest',
  account_kind_apple: 'Apple account',
  account_kind_google: 'Google account',
  account_kind_guest: 'Guest',
  account_kind_device: 'Device',
  profile_birth_section: 'Birth info',
  profile_birth_required: 'Add your birth date and birth city to unlock the personal-fit chapter.',
  profile_birth_required_cta: 'Add birth info',
  profile_birth_edit_cta: 'Edit birth info',
  profile_sign_out: 'Sign out',
  profile_sign_out_confirm:
    'You will return to the sign-in screen. Your sites and reports stay on the server under this account.',
  profile_delete_account: 'Delete account',
  profile_delete_confirm_title: 'Delete account?',
  profile_delete_confirm_body:
    'This permanently erases your birth info, sites, and reports, and unlinks your sign-in. This cannot be undone.',
  profile_delete_confirm_cta: 'Delete',
  profile_delete_failed: 'Could not delete your account. Please try again.',
  cancel: 'Cancel',
  birth_info_title: 'Birth info',
  birth_info_subtitle:
    'Used for the personal Ba Zi / Ming Gua chapter in your feng-shui report. Stored securely on your account.',
  birth_date_label: 'Birth date',
  birth_calendar_solar: 'Solar',
  birth_calendar_lunar: 'Chinese (lunar)',
  birth_calendar_lunar_hint: 'Enter the lunar month and day (leap months not distinguished).',
  birth_time_label: 'Birth hour (shichen)',
  birth_time_unknown: 'Unknown hour',
  birth_gender_label: 'Gender',
  birth_gender_male: 'Male',
  birth_gender_female: 'Female',
  birth_city_label: 'Birth city',
  birth_city_placeholder: 'City where you were born',
  birth_city_required: 'Please select a birth city from the list.',
  birth_save: 'Save',
  birth_saved: 'Saved',
  birth_saving: 'Saving…',
  birth_hint: 'Powers the personal Ba Zi / Ming Gua chapter in your report.',
  share_chapter: 'Share',
  share_pending: 'Sharing…',
  share_needs_signin: 'Sign in to share chapters.',
  err_generic: 'Something went wrong. Please try again.',
  chat_title: 'Ask about this report',
  chat_empty: 'Ask anything about your feng-shui report.',
  chat_placeholder: 'Type a question…',
  chat_loading: 'Thinking…',
  chat_error: 'Something went wrong. Please try again.',
  chat_pro_unlimited: 'Unlimited follow-ups',
  chat_buy_credits: "You're out of chat replies — tap to get more.",
  chat_free_remaining: '{remaining} free replies left',
  chat_pool_remaining: '{remaining} replies left this month',
  chat_pro_required: 'Unlock this report to ask follow-up questions.',
  chat_cta: 'Ask about this report',
  chat_suggest_1: 'What does this report say about my wealth sector?',
  chat_suggest_2: 'Which chapter should I read first?',
  chat_suggest_3: 'Explain the flying-star plate in plain language',
  chat_report: 'Report',
  chat_report_confirm_title: 'Report this response?',
  chat_report_confirm_body:
    'Flag this AI response as objectionable. We review reports and take action.',
  chat_report_done: 'Thanks — your report was sent.',
  chat_legal_disclaimer:
    'AI replies are reference-only, may hallucinate or contradict the report, and are not professional advice. Do not rely on chat for construction, purchase, or safety decisions.',
  privacy_section: 'Privacy',
  cross_app_memory_label: 'Cross-app memory',
  cross_app_memory_hint:
    'Let chat reference your readings across all HexAstral apps. Same account only — never shared with anyone else.',
}

const ZH_HANS: Strings = {
  appName: '風',
  empty_title: '尚无站点',
  empty_subtitle: '添加住宅或办公室，从卫星与户型输入探索古典场所理论。',
  empty_cta: '添加站点',
  new_site_address_title: '选择地址',
  new_site_address_subtitle: '输入地址或使用当前定位。',
  new_site_address_placeholder: '街道、城市、国家',
  new_site_address_name_placeholder: '家 / 公司 / 父母家',
  new_site_default_name: '我的宅',
  new_site_address_geocode_error: '无法解析该地址的坐标，请使用「当前定位」或修改地址。',
  new_site_address_geocoding: '正在查询位置…',
  new_site_address_name_label: '名称',
  new_site_address_field_label: '地址',
  new_site_address_use_location: '使用当前定位',
  new_site_facing_title: '确认朝向',
  new_site_facing_subtitle:
    '地图真北朝上（环上 N）。拖动当前选中的箭头，或在户外对准后点「记录」。',
  new_site_facing_map_legend:
    '金 = 楼门 · 蓝 = 户门 · 白 = 手机朝向（户外较准，室内会偏）· 环上 N = 真北',
  new_site_facing_edit_building: '调楼门',
  new_site_facing_edit_unit_door: '调户门',
  new_site_facing_capture_hint: '户外平举手机对准门后点：',
  new_site_facing_capture_building: '记录楼门',
  new_site_facing_capture_unit_door: '记录户门',
  new_site_facing_value: '楼门 {deg}°',
  new_site_facing_door_toggle: '户门不同向（公寓）',
  new_site_facing_door_value: '户门 {deg}°',
  new_site_facing_tile_loading: '加载地图…',
  new_site_facing_tile_error: '地图不可用 — 请对准楼门后点「记录」。',
  new_site_facing_tile_retry: '重试地图',
  new_site_facing_next: '下一步',
  new_site_building_title: '建筑信息',
  new_site_building_year_label: '建成年份',
  new_site_building_moveIn_label: '入住年份',
  new_site_building_year_accuracy: '准确度',
  new_site_building_accuracy_exact: '准确年份',
  new_site_building_accuracy_decade: '只记得是哪个十年',
  new_site_building_accuracy_moveIn: '只知道入住年份',
  new_site_building_accuracy_unknown: '跳过',
  new_site_building_floor_label: '楼层(可选)',
  new_site_building_next: '继续',
  new_site_review_title: '确认',
  new_site_review_address: '地址',
  new_site_review_building_facing: '楼门朝向',
  new_site_review_unit_door: '户门朝向',
  new_site_review_buildYear: '建成年份',
  new_site_review_confirm: '生成报告',
  new_site_review_processing: '分析中… {stage}',
  tab_sites: '站点',
  tab_compass: '罗盘',
  tab_readings: '历史',
  tab_profile: '我',
  compass_heading_title: '方位',
  compass_no_permission: '需要定位权限以获取真北。',
  readings_updated: '更新于 {date}',
  report_loading: '正在加载报告…',
  report_failed: '分析失败：{message}',
  report_pending: '尚未生成 — 点击站点开始分析。',
  report_shell_tag: '报告概览 · 解读生成中',
  report_chapter_pager_hint: '左右滑动逐章阅读。',
  report_data_quality_footer: '部分输入是估算值，可随时用更准的数据重新分析。',
  report_confidence_note:
    '玄空飞星与八宅依你输入的坐向与年份演算；峦头砂水形煞由 AI 与高程推断，仅供参考。',
  report_legal_disclaimer:
    '仅供娱乐、文化探索与个人省思——非专业风水、建筑或施工建议。请勿依此报告作出购房、装修或安全决策。',
  report_chapter_micro_disclaimer:
    '仅供娱乐与文化研习，不构成施工、医疗、财务或人生决策建议。',
  report_map_close: '近景',
  report_map_mid: '周边',
  report_map_wide: '全景',
  report_map_loading: '地图渲染中…',
  report_map_failed: '地图加载失败',
  report_compound_facing_note: '兼向 — 已按替卦盘排盘。',
  report_formli_heading: '形理合参（山水×飞星）',
  report_placement_heading: '古典布局参考',
  report_digest_tag: '概览',
  digest_chart_line: '坐{sit}向{face} · {buildYuan}运{method}盘 · 现{currentYuan}运读盘',
  digest_pattern_ping: '平局',
  digest_pattern_rescued: '{pattern} · 有救',
  digest_pattern_unrescued: '{pattern} · 待补',
  digest_concord_matched: '宅命相配',
  digest_concord_mismatched: '宅命不配',
  digest_exterior_clean: '外局尚清',
  digest_exterior_sha_light: '形煞 {count} 处',
  digest_exterior_sha: '形煞 {count} 处',
  digest_confidence_medium: '飞星 · 中置信',
  digest_confidence_low: '飞星 · 低置信',
  digest_headline_pattern_rescued: '格局「{pattern}」得形势救应，传统上视为形理同参的参考。',
  digest_headline_pattern_unrescued: '格局「{pattern}」形势无救，宜优先阅读化解章。',
  digest_headline_focus: '{palace}宫读「{verdict}」，宜从此处着手调整。',
  digest_headline_exterior_sha: '外局 {count} 处形煞待化，先理外局再调内局。',
  digest_headline_concord_mismatch: '宅命不配，床、门、灶的吉位选择尤为关键。',
  digest_headline_ping: '飞星无特殊格局，请按各宫形理断语逐区阅读。',
  digest_focus_line: '{palace} · {verdict}',
  digest_not_score: '以上标签来自排盘与形势的确定性断语，不是运势打分或百分制指数。',
  share_brand_footer: '風 · Kanyu',
  share_disclaimer: '仅供娱乐与文化研习，非专业建议。',
  reading_copy: '复制',
  reading_chat: '问AI',
  reading_highlight: '划重点',
  term_source: '出处',
  term_ask: '问问这个词',
  tool_glossary: '术语表',
  glossary_intro: '报告中用到的风水术语,按流派归类。',
  placement_door: '大门',
  placement_bed: '床头',
  placement_stove: '灶',
  placement_desk: '书桌',
  chapter_external_landform: '外峦头',
  chapter_personal_fit: '命卦',
  chapter_flying_stars: '飞星',
  chapter_annual_directions: '流年',
  chapter_remediation: '化解概念（研习）',
  chapter_auspicious_objects: '陈设参考（研习）',
  flying_stars_explainer:
    '盘面九格对应住宅的九个方位。每格左上是山星（古典读法：人丁、健康、关系），右上是向星（古典读法：资源）；淡色大字是运星，底部是卦名与今年的流年星。字偏亮为旺、生，偏暗为退、死，偏红的是煞位——供研习参考，非「管财运」或「必须化解」的指令。',
  nav_back: '返回',
  new_site_review_ai_disclaimer:
    '我们会渲染带标注的卫星图，并对其运行 AI 视觉模型来识别形煞 / 砂 / 水。图像仅一次性处理，生成报告后不会保留。仅供娱乐、文化探索与个人省思——非专业风水、建筑或施工建议。请自行核实坐向、建成年份与户型图输入。',
  new_site_review_iap_note: '每个地点一份报告，单次购买永久解锁。',
  new_site_review_birth_title: '个人命卦章节',
  new_site_review_birth_add: '添加生辰',
  new_site_review_birth_none:
    '未提供生辰：报告将生成 5 章（不含个人命卦匹配）。添加生辰即可解锁第 6 章。',
  new_site_review_birth_have: '已提供生辰 · 报告将包含「个人命卦匹配」章节。',
  new_site_birth_title: '个人命卦',
  new_site_birth_desc_have: '已使用你保存的生辰，报告将包含「个人命卦匹配」章节。',
  new_site_birth_desc_none:
    '「个人命卦匹配」（八宅）章节需要出生年份与性别。可现在设置，或跳过（生成 5 章报告）。',
  new_site_birth_edit: '编辑生辰',
  new_site_birth_add: '设置生辰信息',
  new_site_birth_continue: '继续',
  new_site_birth_skip: '跳过，生成 5 章报告',
  new_site_floorplan_title: '户型图（可选）',
  new_site_floorplan_desc:
    '上传户型图即可进行室内堪舆——公寓一张图，别墅或多层住宅可上传多张。请在下方将图纸对齐正北。上传时会自动清除 GPS 与元数据。',
  new_site_floorplan_permission: '需要相册权限来选择户型图，请在系统设置中开启。',
  new_site_floorplan_north_label: '对齐正北',
  new_site_floorplan_north_reset: '重置正北',
  new_site_floorplan_add: '添加户型图',
  new_site_floorplan_continue: '继续',
  new_site_floorplan_skip: '跳过（仅生成室外报告）',
  new_site_floorplan_count_one: '1 张 · 公寓',
  new_site_floorplan_count_villa: '{n} 张 · 别墅／多层',
  new_site_floorplan_max: '最多上传 {n} 张户型图。',
  new_site_floorplan_grid_show: '显示九宫格',
  new_site_floorplan_grid_hide: '隐藏九宫格',
  new_site_review_floorplan: '户型图',
  report_unlock_title: '解锁这份报告',
  paywall_title: '完整堪舆报告',
  paywall_subtitle_analyze: '一次购买解锁该址的结构化站点报告——卫星语境、飞星排盘与 AI 章节（学习工具）。',
  paywall_subtitle_chat: '购买后可无限追问本报告的 AI 解读。',
  paywall_plan_single: '站点分析',
  paywall_cta: '购买报告',
  paywall_success: '已解锁——正在生成报告…',
  paywall_restore: '恢复购买',
  paywall_failed: '购买失败，请重试。',
  paywall_unavailable: '当前版本无法购买。',
  paywall_bullet_report: '标注卫星图 + 确定性玄空 / 八宅演算',
  paywall_bullet_chat: '本报告无限 AI 追问',
  paywall_bullet_once: '按次购买，无需订阅',
  paywall_legal_disclaimer:
    '仅供娱乐与文化探索，不能替代现场勘验或持证专业人士。报告与对话可能不准确。详见 kanyu.hexastral.com/terms 与 kanyu.hexastral.com/privacy/feng。',
  new_site_review_no_floorplan: '无户型图——仅外局 / 朝向',
  new_site_review_analyze_eta: '分析通常需要 1–3 分钟。',
  new_site_review_error_paywall: '需要一次性购买或 Pro 订阅。',
  new_site_review_error_network: '网络错误——请检查连接后重试。',
  sign_in_hint: '登录后可跨设备保存站点与报告。',
  sign_in_google: '使用 Google 继续',
  sign_in_guest: '以访客身份继续',
  account_kind_apple: 'Apple 账号',
  account_kind_google: 'Google 账号',
  account_kind_guest: '访客',
  account_kind_device: '本机',
  profile_birth_section: '生辰信息',
  profile_birth_required: '填写出生日期与出生地，解锁个人命卦匹配章节。',
  profile_birth_required_cta: '填写生辰',
  profile_birth_edit_cta: '编辑生辰',
  profile_sign_out: '退出登录',
  profile_sign_out_confirm: '将返回登录页。你的站点与报告仍保存在当前账号下。',
  profile_delete_account: '删除账号',
  profile_delete_confirm_title: '删除账号？',
  profile_delete_confirm_body:
    '这将永久清除你的生辰信息、站点与报告,并解除登录绑定。此操作无法撤销。',
  profile_delete_confirm_cta: '删除',
  profile_delete_failed: '删除账号失败,请重试。',
  cancel: '取消',
  birth_info_title: '生辰信息',
  birth_info_subtitle: '用于风水报告中的八字 / 命卦章节，安全保存在你的账号下。',
  birth_date_label: '出生日期',
  birth_calendar_solar: '阳历',
  birth_calendar_lunar: '农历',
  birth_calendar_lunar_hint: '输入农历月日（闰月不区分）',
  birth_time_label: '出生时辰',
  birth_time_unknown: '时辰不详',
  birth_gender_label: '性别',
  birth_gender_male: '男',
  birth_gender_female: '女',
  birth_city_label: '出生城市',
  birth_city_placeholder: '输入出生城市',
  birth_city_required: '请从列表中选择出生城市。',
  birth_save: '保存',
  birth_saved: '已保存',
  birth_saving: '保存中…',
  birth_hint: '用于风水报告中的个人八字 / 命卦章节。',
  share_chapter: '分享',
  share_pending: '分享中…',
  share_needs_signin: '登录后即可分享章节。',
  err_generic: '出错了，请稍后再试。',
  chat_title: '聊聊这份风水报告',
  chat_empty: '关于这份风水报告，问我任何问题。',
  chat_placeholder: '输入你的问题…',
  chat_loading: '正在思考…',
  chat_error: '出错了，请稍后再试。',
  chat_pro_unlimited: '无限追问',
  chat_buy_credits: '对话次数已用完 — 点此获取更多。',
  chat_free_remaining: '还剩 {remaining} 次免费回复',
  chat_pool_remaining: '本月还剩 {remaining} 次回复',
  chat_pro_required: '解锁本报告后即可追问。',
  chat_cta: '聊聊这份报告',
  chat_suggest_1: '报告里说的财位指什么？',
  chat_suggest_2: '我该先看哪一章？',
  chat_suggest_3: '用白话解释一下飞星盘',
  chat_report: '举报',
  chat_report_confirm_title: '举报这条回复？',
  chat_report_confirm_body: '将这条 AI 回复标记为不当内容。我们会审核并处理。',
  chat_report_done: '已收到你的举报，谢谢。',
  chat_legal_disclaimer:
    'AI 回复仅供参考，可能幻觉或与报告矛盾，非专业建议。请勿依据对话作出施工、购房或安全决策。',
  privacy_section: '隐私',
  cross_app_memory_label: '跨应用记忆',
  cross_app_memory_hint: '允许对话参考你在所有 HexAstral 应用中的解读。仅限同一账户，绝不外泄。',
}

const ZH_HANT: Strings = {
  ...ZH_HANS,
  appName: '風',
  empty_title: '尚無站點',
  empty_subtitle: '新增住家或辦公室，從衛星與戶型輸入探索古典場所理論。',
  empty_cta: '新增站點',
  new_site_address_title: '選擇地址',
  new_site_address_subtitle: '輸入地址或使用目前位置。',
  new_site_address_geocode_error: '無法解析此地址的座標，請使用「目前位置」或修改地址。',
  new_site_address_geocoding: '正在查詢位置…',
  new_site_address_name_label: '名稱',
  new_site_address_use_location: '使用目前位置',
  new_site_facing_title: '確認朝向',
  new_site_facing_subtitle:
    '地圖真北朝上（環上 N）。拖曳目前選中的箭頭，或在戶外對準後點「記錄」。',
  new_site_facing_map_legend: '金 = 樓門 · 藍 = 戶門 · 白 = 手機朝向（戶外較準）· 環上 N = 真北',
  new_site_facing_edit_building: '調樓門',
  new_site_facing_edit_unit_door: '調戶門',
  new_site_facing_capture_hint: '戶外平舉手機對準門後點：',
  new_site_facing_capture_building: '記錄樓門',
  new_site_facing_capture_unit_door: '記錄戶門',
  new_site_facing_door_toggle: '戶門不同向（公寓）',
  new_site_facing_door_value: '戶門 {deg}°',
  new_site_facing_tile_error: '地圖不可用 — 請對準樓門後點「記錄」。',
  new_site_facing_tile_retry: '重試地圖',
  new_site_facing_tile_loading: '載入地圖…',
  new_site_facing_next: '下一步',
  new_site_building_title: '建築資訊',
  new_site_building_year_label: '建成年份',
  new_site_building_year_accuracy: '準確度',
  new_site_building_accuracy_exact: '確切年份',
  new_site_building_accuracy_decade: '只記得是哪個十年',
  new_site_building_accuracy_moveIn: '只知道入住年份',
  new_site_building_accuracy_unknown: '略過',
  new_site_building_floor_label: '樓層(選填)',
  new_site_building_next: '繼續',
  new_site_review_title: '確認',
  new_site_review_address: '地址',
  new_site_review_building_facing: '樓門朝向',
  new_site_review_unit_door: '戶門朝向',
  new_site_review_buildYear: '建成年份',
  new_site_review_confirm: '生成報告',
  new_site_review_processing: '分析中… {stage}',
  tab_sites: '地點',
  tab_compass: '羅盤',
  tab_readings: '歷史',
  tab_profile: '我',
  compass_heading_title: '方位',
  compass_no_permission: '需要定位權限以取得真北。',
  readings_updated: '更新於 {date}',
  report_loading: '正在載入報告…',
  report_failed: '分析失敗：{message}',
  report_pending: '尚未生成 — 點選地點開始分析。',
  report_shell_tag: '報告概覽 · 解讀生成中',
  report_chapter_pager_hint: '左右滑動逐章閱讀。',
  report_data_quality_footer: '部分輸入為估算，可隨時用更準的資料重新分析。',
  report_confidence_note:
    '玄空飛星與八宅依你輸入的坐向與年份演算；巒頭砂水形煞由 AI 與高程推斷，僅供參考。',
  report_legal_disclaimer:
    '僅供娛樂、文化探索與個人省思——非專業風水、建築或施工建議。請勿依此報告作出購屋、裝修或安全決策。',
  report_chapter_micro_disclaimer:
    '僅供娛樂與文化研習，不構成施工、醫療、財務或人生決策建議。',
  report_map_close: '近景',
  report_map_mid: '周邊',
  report_map_wide: '全景',
  report_map_loading: '地圖渲染中…',
  report_map_failed: '地圖載入失敗',
  report_compound_facing_note: '兼向 — 已按替卦盤排盤。',
  report_formli_heading: '形理合參（山水×飛星）',
  report_placement_heading: '古典佈局參考',
  report_digest_tag: '概覽',
  digest_chart_line: '坐{sit}向{face} · {buildYuan}運{method}盤 · 現{currentYuan}運讀盤',
  digest_pattern_ping: '平局',
  digest_pattern_rescued: '{pattern} · 有救',
  digest_pattern_unrescued: '{pattern} · 待補',
  digest_concord_matched: '宅命相配',
  digest_concord_mismatched: '宅命不配',
  digest_exterior_clean: '外局尚清',
  digest_exterior_sha_light: '形煞 {count} 處',
  digest_exterior_sha: '形煞 {count} 處',
  digest_confidence_medium: '飛星 · 中置信',
  digest_confidence_low: '飛星 · 低置信',
  digest_headline_pattern_rescued: '格局「{pattern}」得形勢救應，傳統上視為形理同參的參考。',
  digest_headline_pattern_unrescued: '格局「{pattern}」形勢無救，宜優先閱讀化解章。',
  digest_headline_focus: '{palace}宮讀「{verdict}」，宜從此處著手調整。',
  digest_headline_exterior_sha: '外局 {count} 處形煞待化，先理外局再調內局。',
  digest_headline_concord_mismatch: '宅命不配，床、門、灶的吉位選擇尤為關鍵。',
  digest_headline_ping: '飛星無特殊格局，請按各宮形理斷語逐區閱讀。',
  digest_focus_line: '{palace} · {verdict}',
  digest_not_score: '以上標籤來自排盤與形勢的確定性斷語，不是運勢打分或百分制指數。',
  share_brand_footer: '風 · Kanyu',
  share_disclaimer: '僅供娛樂與文化研習，非專業建議。',
  reading_copy: '複製',
  reading_chat: '問AI',
  reading_highlight: '劃重點',
  term_source: '出處',
  term_ask: '問問這個詞',
  tool_glossary: '術語表',
  glossary_intro: '報告中用到的風水術語,按流派歸類。',
  placement_door: '大門',
  placement_bed: '床頭',
  placement_stove: '灶',
  placement_desk: '書桌',
  chapter_external_landform: '外巒頭',
  chapter_personal_fit: '命卦',
  chapter_flying_stars: '飛星',
  chapter_annual_directions: '流年',
  chapter_remediation: '化解概念（研習）',
  chapter_auspicious_objects: '陳設參考（研習）',
  flying_stars_explainer:
    '盤面九格對應住宅的九個方位。每格左上為山星（古典讀法：人丁、健康、關係），右上為向星（古典讀法：資源）；淡色大字是運星，底部為卦名與今年的流年星。字偏亮為旺、生，偏暗為退、死，偏紅者為煞位——供研習參考，非「管財運」或「必須化解」的指令。',
  new_site_review_ai_disclaimer:
    '我們會渲染帶標註的衛星圖，並對其運行 AI 視覺模型來識別形煞 / 砂 / 水。圖像僅一次性處理，生成報告後不會保留。僅供娛樂、文化探索與個人省思——非專業風水、建築或施工建議。請自行核實坐向、建成年份與戶型圖輸入。',
  new_site_review_iap_note: '每個地點一份報告，單次購買永久解鎖。',
  new_site_review_birth_title: '個人命卦章節',
  new_site_review_birth_add: '新增生辰',
  new_site_review_birth_none:
    '未提供生辰：報告將生成 5 章（不含個人命卦匹配）。新增生辰即可解鎖第 6 章。',
  new_site_review_birth_have: '已提供生辰 · 報告將包含「個人命卦匹配」章節。',
  new_site_birth_title: '個人命卦',
  new_site_birth_desc_have: '已使用你保存的生辰，報告將包含「個人命卦匹配」章節。',
  new_site_birth_desc_none:
    '「個人命卦匹配」（八宅）章節需要出生年份與性別。可現在設定，或略過（生成 5 章報告）。',
  new_site_birth_edit: '編輯生辰',
  new_site_birth_add: '設定生辰資訊',
  new_site_birth_continue: '繼續',
  new_site_birth_skip: '略過，生成 5 章報告',
  new_site_floorplan_title: '戶型圖（選填）',
  new_site_floorplan_desc:
    '上傳戶型圖即可進行室內堪輿——公寓一張圖，別墅或多層住宅可上傳多張。請在下方將圖紙對齊正北。上傳時會自動清除 GPS 與中繼資料。',
  new_site_floorplan_permission: '需要相簿權限來選擇戶型圖，請在系統設定中開啟。',
  new_site_floorplan_north_label: '對齊正北',
  new_site_floorplan_north_reset: '重置正北',
  new_site_floorplan_add: '新增戶型圖',
  new_site_floorplan_continue: '繼續',
  new_site_floorplan_skip: '略過（僅生成室外報告）',
  new_site_floorplan_count_one: '1 張 · 公寓',
  new_site_floorplan_count_villa: '{n} 張 · 別墅／多層',
  new_site_floorplan_max: '最多上傳 {n} 張戶型圖。',
  new_site_floorplan_grid_show: '顯示九宮格',
  new_site_floorplan_grid_hide: '隱藏九宮格',
  new_site_review_floorplan: '戶型圖',
  report_unlock_title: '解鎖這份報告',
  paywall_title: '完整堪輿報告',
  paywall_subtitle_analyze: '一次購買解鎖該址的結構化站點報告——衛星語境、飛星排盤與 AI 章節（學習工具）。',
  paywall_subtitle_chat: '購買後可無限追問本報告的 AI 解讀。',
  paywall_plan_single: '站點分析',
  paywall_cta: '購買報告',
  paywall_success: '已解鎖——正在生成報告…',
  paywall_restore: '恢復購買',
  paywall_failed: '購買失敗，請重試。',
  paywall_unavailable: '目前版本無法購買。',
  paywall_bullet_report: '標註衛星圖 + 確定性玄空 / 八宅演算',
  paywall_bullet_chat: '本報告無限 AI 追問',
  paywall_bullet_once: '按次購買，無需訂閱',
  paywall_legal_disclaimer:
    '僅供娛樂與文化探索，不能替代現場勘驗或持證專業人士。報告與對話可能不準確。詳見 kanyu.hexastral.com/terms 與 kanyu.hexastral.com/privacy/feng。',
  new_site_review_no_floorplan: '無戶型圖——僅外局 / 朝向',
  new_site_review_analyze_eta: '分析通常需要 1–3 分鐘。',
  new_site_review_error_paywall: '需要一次性購買或 Pro 訂閱。',
  new_site_review_error_network: '網路錯誤——請檢查連線後重試。',
  sign_in_hint: '登入後可跨裝置保存地點與報告。',
  sign_in_google: '使用 Google 繼續',
  sign_in_guest: '以訪客身份繼續',
  account_kind_apple: 'Apple 帳號',
  account_kind_google: 'Google 帳號',
  account_kind_guest: '訪客',
  account_kind_device: '本機',
  profile_birth_section: '生辰資訊',
  profile_birth_required: '填寫出生日期與出生地，解鎖個人命卦匹配章節。',
  profile_birth_required_cta: '填寫生辰',
  profile_birth_edit_cta: '編輯生辰',
  profile_sign_out: '登出',
  profile_sign_out_confirm: '將返回登入頁。你的地點與報告仍保存在目前帳號下。',
  profile_delete_account: '刪除帳號',
  profile_delete_confirm_title: '刪除帳號？',
  profile_delete_confirm_body:
    '這將永久清除你的生辰資訊、地點與報告,並解除登入綁定。此操作無法撤銷。',
  profile_delete_confirm_cta: '刪除',
  profile_delete_failed: '刪除帳號失敗,請重試。',
  cancel: '取消',
  birth_info_title: '生辰資訊',
  birth_info_subtitle: '用於風水報告中的八字／命卦章節，安全保存在你的帳號下。',
  birth_date_label: '出生日期',
  birth_calendar_solar: '陽曆',
  birth_calendar_lunar: '農曆',
  birth_calendar_lunar_hint: '輸入農曆月日（閏月不區分）',
  birth_time_label: '出生時辰',
  birth_time_unknown: '時辰不詳',
  birth_gender_label: '性別',
  birth_gender_male: '男',
  birth_gender_female: '女',
  birth_city_label: '出生城市',
  birth_city_placeholder: '輸入出生城市',
  birth_city_required: '請從列表中選擇出生城市。',
  birth_save: '儲存',
  birth_saved: '已儲存',
  birth_saving: '儲存中…',
  birth_hint: '用於風水報告中的個人八字／命卦章節。',
  share_chapter: '分享',
  share_pending: '分享中…',
  share_needs_signin: '登入後即可分享章節。',
  err_generic: '發生錯誤，請稍後再試。',
  chat_title: '聊聊這份風水報告',
  chat_empty: '關於這份風水報告，問我任何問題。',
  chat_placeholder: '輸入你的問題…',
  chat_loading: '正在思考…',
  chat_error: '發生錯誤，請稍後再試。',
  chat_pro_unlimited: '無限追問',
  chat_buy_credits: '對話次數已用完 — 點此取得更多。',
  chat_free_remaining: '還剩 {remaining} 次免費回覆',
  chat_pool_remaining: '本月還剩 {remaining} 次回覆',
  chat_pro_required: '解鎖本報告後即可追問。',
  chat_cta: '聊聊這份報告',
  chat_suggest_1: '報告裡說的財位指什麼？',
  chat_suggest_2: '我該先看哪一章？',
  chat_suggest_3: '用白話解釋一下飛星盤',
  chat_report: '檢舉',
  chat_report_confirm_title: '檢舉這則回覆？',
  chat_report_confirm_body: '將這則 AI 回覆標記為不當內容。我們會審核並處理。',
  chat_report_done: '已收到你的檢舉，謝謝。',
  chat_legal_disclaimer:
    'AI 回覆僅供參考，可能幻覺或與報告矛盾，非專業建議。請勿依據對話作出施工、購屋或安全決策。',
  privacy_section: '隱私',
  cross_app_memory_label: '跨應用記憶',
  cross_app_memory_hint: '允許對話參考你在所有 HexAstral 應用中的解讀。僅限同一帳號，絕不外洩。',
}

const JA: Strings = {
  ...EN,
  appName: '風',
  empty_title: 'まだサイトがありません',
  empty_subtitle: '自宅やオフィスを追加し、衛星と間取り入力から古典場所理論を学べます。',
  empty_cta: 'サイトを追加',
  new_site_address_title: '住所を選ぶ',
  new_site_address_subtitle: '住所を入力するか、現在地を使います。',
  new_site_address_geocode_error:
    '住所から座標を取得できませんでした。「現在地を使う」か住所を修正してください。',
  new_site_address_geocoding: '位置を検索中…',
  new_site_address_name_label: '名前',
  new_site_address_name_placeholder: '自宅 / 職場 / 実家',
  new_site_default_name: 'わたしの場所',
  new_site_address_field_label: '住所',
  new_site_address_use_location: '現在地を使う',
  new_site_facing_title: '建物の向きを確認',
  new_site_facing_subtitle:
    '地図は真北（リングの N）。選択中の矢印をドラッグするか、屋外で向けて「記録」を押します。',
  new_site_facing_map_legend:
    '金 = 建物入口 · 青 = 住戸玄関 · 白 = スマホの向き（屋外推奨）· N = 真北',
  new_site_facing_edit_building: '建物入口',
  new_site_facing_edit_unit_door: '住戸玄関',
  new_site_facing_capture_hint: '屋外で水平に持ち、向けてから：',
  new_site_facing_capture_building: '建物入口を記録',
  new_site_facing_capture_unit_door: '住戸玄関を記録',
  new_site_facing_value: '建物 {deg}°',
  new_site_facing_door_toggle: '住戸玄関が別方向',
  new_site_facing_door_value: '玄関 {deg}°',
  new_site_facing_tile_loading: '地図を読み込み中…',
  new_site_facing_tile_error: '地図を取得できません — 向けて「記録」を使ってください。',
  new_site_facing_tile_retry: '地図を再試行',
  new_site_facing_next: '次へ',
  new_site_building_title: '建物について',
  new_site_building_year_label: '築年',
  new_site_building_year_accuracy: '確度',
  new_site_building_accuracy_exact: '正確な年',
  new_site_building_accuracy_decade: '年代まで',
  new_site_building_accuracy_moveIn: '入居年のみ',
  new_site_building_accuracy_unknown: 'スキップ',
  new_site_building_moveIn_label: '入居年',
  new_site_building_floor_label: '階(任意)',
  new_site_building_next: '続ける',
  new_site_review_title: '確認',
  new_site_review_address: '住所',
  new_site_review_building_facing: '建物入口',
  new_site_review_unit_door: '住戸玄関',
  new_site_review_buildYear: '築年',
  new_site_review_confirm: 'レポートを生成',
  new_site_review_processing: '分析中… {stage}',
  tab_sites: '場所',
  tab_compass: 'コンパス',
  tab_readings: '履歴',
  tab_profile: 'プロフィール',
  compass_heading_title: '方位',
  compass_no_permission: '真北を計算するには位置情報の許可が必要です。',
  readings_updated: '更新日 {date}',
  report_loading: 'レポートを読み込み中…',
  report_failed: '分析失敗：{message}',
  report_pending: 'まだ分析されていません — 場所をタップして開始します。',
  report_shell_tag: '概観 · 鑑定を生成中',
  report_chapter_pager_hint: '左右にスワイプして章を読みます。',
  report_data_quality_footer: '一部の入力は推定値です。より正確なデータでいつでも再分析できます。',
  report_confidence_note:
    '玄空飛星と八宅は入力した向き・築年から算出。巒頭（砂水形煞）は AI と標高からの推定で、参考のみ。',
  report_legal_disclaimer:
    '娯楽・文化探索・個人的省察のみを目的とします。専門的な風水・建築・施工助言ではありません。購入・改修・安全の判断に依拠しないでください。',
  report_chapter_micro_disclaimer:
    '娯楽・文化研習のみ。施工・医療・財務・人生の意思決定助言ではありません。',
  report_map_close: '近景',
  report_map_mid: '周辺',
  report_map_wide: '全景',
  report_map_loading: '地図を生成中…',
  report_map_failed: '地図を読み込めません',
  report_compound_facing_note: '兼向 — 替卦盤で表示しています。',
  report_formli_heading: '形理合参（山水×飛星）',
  report_placement_heading: '古典配置メモ',
  report_digest_tag: '概観',
  digest_chart_line: '坐{sit}向{face} · {buildYuan}運{method}盤 · 現{currentYuan}運で読む',
  digest_pattern_ping: '平局',
  digest_pattern_rescued: '{pattern} · 救済あり',
  digest_pattern_unrescued: '{pattern} · 要調整',
  digest_concord_matched: '宅命相配',
  digest_concord_mismatched: '宅命不配',
  digest_exterior_clean: '外局クリア',
  digest_exterior_sha_light: '形煞 {count} 件',
  digest_exterior_sha: '形煞 {count} 件',
  digest_confidence_medium: '飛星 · 中信頼',
  digest_confidence_low: '飛星 · 低信頼',
  digest_headline_pattern_rescued: '格局「{pattern}」は地形で救われており、形理同参の文化的参照と読めます。',
  digest_headline_pattern_unrescued: '格局「{pattern}」は地形で救われず、化解章を優先してください。',
  digest_headline_focus: '{palace}宮は「{verdict}」— ここから調整を。',
  digest_headline_exterior_sha: '外局に形煞 {count} 件 — 内局より先に外局を。',
  digest_headline_concord_mismatch: '宅命不配 — 床・門・灶の吉方位が特に重要。',
  digest_headline_ping: '特殊格局なし — 各宮の形理断語を順に読んでください。',
  digest_focus_line: '{palace} · {verdict}',
  digest_not_score: '表示は排盤と地形の確定的な断語であり、運勢スコアや百分率ではありません。',
  share_brand_footer: '風 · Kanyu',
  share_disclaimer: '娯楽・文化学習用であり、専門的助言ではありません。',
  reading_copy: 'コピー',
  reading_chat: 'AIに聞く',
  reading_highlight: 'ハイライト',
  term_source: '出典',
  term_ask: 'この語をAIに聞く',
  tool_glossary: '用語集',
  glossary_intro: 'レポートで使われる風水用語を流派別にまとめています。',
  placement_door: '玄関',
  placement_bed: 'ベッド(枕)',
  placement_stove: 'かまど',
  placement_desk: 'デスク',
  chapter_external_landform: '巒頭',
  chapter_personal_fit: '命卦',
  chapter_flying_stars: '飛星',
  chapter_annual_directions: '流年',
  chapter_remediation: '化解概念（学習）',
  chapter_auspicious_objects: '設え参考（学習）',
  flying_stars_explainer:
    '九つのマスは住まいの九方位に対応します。各マスの左上が山星（古典的読み：人・健康・縁）、右上が向星（古典的読み：資源）、薄い大きな数字が運星、下段は卦名と今年の流年星です。数字が明るいほど旺気、暗いほど衰え、赤は研習上の注意方位 —— 「開運」や「必ず化解」の指示ではありません。',
  nav_back: '戻る',
  new_site_review_ai_disclaimer:
    '注釈付き衛星画像を生成し、AI ビジョンモデルで形煞 / 砂 / 水を識別します。画像は一度だけ処理され、レポート生成後は保存されません。娯楽・文化探索・個人的省察のみを目的とし、専門的な風水・建築・施工助言ではありません。坐向・建築年・間取り入力はご自身で確認してください。',
  new_site_review_iap_note: '1 地点につき 1 レポート。単発購入で解放されます。',
  new_site_review_birth_title: '個人命卦の章',
  new_site_review_birth_add: '生年月日を追加',
  new_site_review_birth_none:
    '生年月日が未入力：レポートは 5 章（個人命卦の適合なし）。入力すると 6 章目が解放されます。',
  new_site_review_birth_have: '生年月日を入力済み · 個人命卦の適合の章を含みます。',
  new_site_birth_title: '個人命卦',
  new_site_birth_desc_have:
    '保存済みの生年月日を使用します。レポートに「個人命卦の適合」章を含みます。',
  new_site_birth_desc_none:
    '「個人命卦の適合」（八宅）章には生年と性別が必要です。今すぐ設定するか、スキップ（5 章のレポート）できます。',
  new_site_birth_edit: '生年月日を編集',
  new_site_birth_add: '生年月日を設定',
  new_site_birth_continue: '続ける',
  new_site_birth_skip: 'スキップ（5 章のレポート）',
  new_site_floorplan_title: '間取り図（任意）',
  new_site_floorplan_desc:
    '間取り図をアップロードすると室内の堪輿分析ができます。マンションは1枚、戸建て・複数階は複数枚。下で図面を真北に合わせてください。アップロード時にGPSとメタデータは削除されます。',
  new_site_floorplan_permission:
    '間取り図を選ぶには写真へのアクセスが必要です。設定で許可してください。',
  new_site_floorplan_north_label: '真北に合わせる',
  new_site_floorplan_north_reset: '北をリセット',
  new_site_floorplan_add: '間取り図を追加',
  new_site_floorplan_continue: '続ける',
  new_site_floorplan_skip: 'スキップ（屋外のみのレポート）',
  new_site_floorplan_count_one: '1枚 · マンション',
  new_site_floorplan_count_villa: '{n}枚 · 戸建て／複数階',
  new_site_floorplan_max: '間取り図は最大{n}枚までです。',
  new_site_floorplan_grid_show: '九宮グリッドを表示',
  new_site_floorplan_grid_hide: '九宮グリッドを非表示',
  new_site_review_floorplan: '間取り図',
  report_unlock_title: 'このレポートを解錠',
  paywall_title: 'フルサイトレポート',
  paywall_subtitle_analyze:
    '1回の購入でこの物件の構造化サイトレポート（衛星・飛星・AI 章）が開放されます（学習ツール）。',
  paywall_subtitle_chat: '購入後、このレポートについて AI に無制限で質問できます。',
  paywall_plan_single: 'サイト分析',
  paywall_cta: 'レポートを購入',
  paywall_success: '解錠しました——レポートを生成中…',
  paywall_restore: '購入を復元',
  paywall_failed: '購入に失敗しました。もう一度お試しください。',
  paywall_unavailable: 'このビルドでは購入できません。',
  paywall_bullet_report: '注釈付き衛星タイル + 決定論的玄空 / 八宅演算',
  paywall_bullet_chat: 'このレポートへの AI 質問は無制限',
  paywall_bullet_once: 'サブスク不要の買い切り',
  paywall_legal_disclaimer:
    '娯楽・文化探索のみ。現地調査や有資格専門家の代替ではありません。レポートとチャットは不正確な場合があります。kanyu.hexastral.com/terms と kanyu.hexastral.com/privacy/feng を参照。',
  new_site_review_no_floorplan: '間取りなし——外局 / 向きのみ',
  new_site_review_analyze_eta: '分析には通常 1〜3 分かかります。',
  new_site_review_error_paywall: '買い切り購入または Pro サブスクが必要です。',
  new_site_review_error_network: 'ネットワークエラー——接続を確認して再試行してください。',
  sign_in_hint: 'ログインすると、端末をまたいで場所とレポートを保存できます。',
  sign_in_google: 'Google で続ける',
  sign_in_guest: 'ゲストとして続ける',
  account_kind_apple: 'Apple アカウント',
  account_kind_google: 'Google アカウント',
  account_kind_guest: 'ゲスト',
  account_kind_device: '端末',
  profile_birth_section: '生年月日',
  profile_birth_required: '生年月日と出生地を入力すると、個人命卦の章が解放されます。',
  profile_birth_required_cta: '生年月日を入力',
  profile_birth_edit_cta: '生年月日を編集',
  profile_sign_out: 'サインアウト',
  profile_sign_out_confirm:
    'サインイン画面に戻ります。サイトとレポートはこのアカウントに残ります。',
  profile_delete_account: 'アカウントを削除',
  profile_delete_confirm_title: 'アカウントを削除しますか？',
  profile_delete_confirm_body:
    '生年月日・場所・レポートを完全に削除し、サインインの連携も解除します。この操作は取り消せません。',
  profile_delete_confirm_cta: '削除',
  profile_delete_failed: 'アカウントを削除できませんでした。もう一度お試しください。',
  cancel: 'キャンセル',
  birth_info_title: '生年月日',
  birth_info_subtitle: '風水レポートの八字・命卦章に使用します。アカウントに安全に保存されます。',
  birth_date_label: '生年月日',
  birth_calendar_solar: '新暦',
  birth_calendar_lunar: '旧暦',
  birth_calendar_lunar_hint: '旧暦の月日を入力（閏月は区別なし）',
  birth_time_label: '出生時刻（十二支）',
  birth_time_unknown: '時刻不明',
  birth_gender_label: '性別',
  birth_gender_male: '男性',
  birth_gender_female: '女性',
  birth_city_label: '出生地',
  birth_city_placeholder: '出生地の都市',
  birth_city_required: 'リストから出生地を選んでください。',
  birth_save: '保存',
  birth_saved: '保存しました',
  birth_saving: '保存中…',
  birth_hint: '風水レポートの個人八字・命卦章の生成に使用します。',
  share_chapter: '共有',
  share_pending: '共有中…',
  share_needs_signin: 'ログインして章を共有します。',
  err_generic: 'エラーが発生しました。もう一度お試しください。',
  chat_title: 'このレポートについて聞く',
  chat_empty: '風水レポートについて何でも聞いてください。',
  chat_placeholder: '質問を入力…',
  chat_loading: '考えています…',
  chat_error: 'エラーが発生しました。もう一度お試しください。',
  chat_pro_unlimited: '無制限の追加質問',
  chat_buy_credits: 'チャット回数を使い切りました — タップで追加。',
  chat_free_remaining: '無料の返信があと {remaining} 回',
  chat_pool_remaining: '今月の返信があと {remaining} 回',
  chat_pro_required: 'このレポートを解放すると追加で質問できます。',
  chat_cta: 'このレポートについて聞く',
  chat_suggest_1: 'レポートの財位とは何を指しますか？',
  chat_suggest_2: '最初に読む章はどれですか？',
  chat_suggest_3: '飛星盤をわかりやすく説明して',
  chat_report: '報告',
  chat_report_confirm_title: 'この返信を報告しますか？',
  chat_report_confirm_body: 'この AI の返信を不適切として報告します。確認のうえ対応します。',
  chat_report_done: '報告を受け付けました。ありがとうございます。',
  chat_legal_disclaimer:
    'AI 返答は参考のみ。幻覚やレポートとの矛盾があり得ます。専門助言ではありません。施工・購入・安全に関する判断に依拠しないでください。',
  privacy_section: 'プライバシー',
  cross_app_memory_label: 'アプリ間メモリ',
  cross_app_memory_hint:
    'すべての HexAstral アプリの鑑定結果をチャットが参照できるようにします。同一アカウントのみ — 他者と共有されません。',
}

const TABLE: Record<Locale, Strings> = {
  en: EN,
  zh: ZH_HANS,
  'zh-Hant': ZH_HANT,
  ja: JA,
}

export function t(
  locale: Locale,
  key: keyof Strings,
  vars?: Record<string, string | number>
): string {
  const template = TABLE[locale][key] ?? TABLE.en[key]
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

export function useStrings(locale: Locale): Strings {
  return TABLE[locale]
}
