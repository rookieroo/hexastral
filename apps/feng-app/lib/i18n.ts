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

type Strings = {
  appName: string

  // Boot / empty state
  empty_title: string
  empty_subtitle: string
  empty_cta: string

  // New-site flow
  new_site_address_title: string
  new_site_address_subtitle: string
  new_site_address_placeholder: string
  new_site_address_geocode_error: string
  new_site_address_geocoding: string

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

  // Report screen
  report_loading: string
  report_failed: string
  report_pending: string
  report_chapter_pager_hint: string
  report_data_quality_footer: string
  report_map_close: string
  report_map_mid: string
  report_map_wide: string
  report_map_loading: string
  report_map_failed: string
  /** AI / VLM processing notice rendered above the "Generate report" button. */
  new_site_review_ai_disclaimer: string
  /** One-time IAP / Pro cost note rendered next to the AI disclaimer. */
  new_site_review_iap_note: string

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
  cancel: string

  // Birth info screen
  birth_info_title: string
  birth_info_subtitle: string
  birth_date_label: string
  birth_time_label: string
  birth_time_unknown: string
  birth_gender_label: string
  birth_city_label: string
  birth_city_placeholder: string
  birth_city_required: string
  birth_save: string
  birth_saving: string

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

  // Privacy (cross-app memory)
  privacy_section: string
  cross_app_memory_label: string
  cross_app_memory_hint: string
}

const EN: Strings = {
  appName: 'Fēng',
  empty_title: 'No sites yet',
  empty_subtitle: 'Add your home or office to get a feng-shui report rooted in the satellite view.',
  empty_cta: 'Add a site',
  new_site_address_title: 'Pick your address',
  new_site_address_subtitle: 'Search or long-press the map to drop a pin.',
  new_site_address_placeholder: 'Street, city, country',
  new_site_address_geocode_error:
    'Could not find coordinates for this address. Try "Use current location" or refine the address.',
  new_site_address_geocoding: 'Looking up location…',
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
  report_loading: 'Loading report…',
  report_failed: 'Analysis failed: {message}',
  report_pending: 'Analysis pending — tap a site to generate a report.',
  report_chapter_pager_hint: 'Swipe to read each chapter.',
  report_data_quality_footer:
    'Some inputs were estimated. You can re-run with better data anytime.',
  report_map_close: 'Close-up',
  report_map_mid: 'Surrounding',
  report_map_wide: 'Wide',
  report_map_loading: 'Rendering map…',
  report_map_failed: 'Map unavailable',
  new_site_review_ai_disclaimer:
    'We render annotated satellite tiles and run AI vision over them to identify 形煞 / 砂 / 水. Imagery is processed once and not stored after the report is built.',
  new_site_review_iap_note:
    'One report per site. Pro subscribers use their monthly quota; otherwise a single purchase unlocks this site.',
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
  cancel: 'Cancel',
  birth_info_title: 'Birth info',
  birth_info_subtitle:
    'Used for the personal Ba Zi / Ming Gua chapter in your feng-shui report. Stored securely on your account.',
  birth_date_label: 'Solar birth date',
  birth_time_label: 'Birth hour (shichen)',
  birth_time_unknown: 'Unknown hour',
  birth_gender_label: 'Gender',
  birth_city_label: 'Birth city',
  birth_city_placeholder: 'City where you were born',
  birth_city_required: 'Please select a birth city from the list.',
  birth_save: 'Save',
  birth_saving: 'Saving…',
  share_chapter: 'Share',
  share_pending: 'Sharing…',
  share_needs_signin: 'Sign in to share chapters.',
  err_generic: 'Something went wrong. Please try again.',
  chat_title: 'Ask about this report',
  chat_empty: 'Ask anything about your feng-shui report.',
  chat_placeholder: 'Type a question…',
  chat_loading: 'Thinking…',
  chat_error: 'Something went wrong. Please try again.',
  chat_pro_unlimited: 'Fēng Pro · unlimited',
  chat_buy_credits: "You're out of chat replies — tap to get more.",
  chat_free_remaining: '{remaining} free replies left',
  chat_pool_remaining: '{remaining} replies left this month',
  chat_pro_required: 'AI chat is a Fēng Pro feature.',
  chat_cta: 'Ask about this report',
  chat_suggest_1: 'How do I improve my wealth corner?',
  chat_suggest_2: 'What should I fix first?',
  chat_suggest_3: 'Which direction suits me best?',
  privacy_section: 'Privacy',
  cross_app_memory_label: 'Cross-app memory',
  cross_app_memory_hint:
    'Let chat reference your readings across all HexAstral apps. Same account only — never shared with anyone else.',
}

const ZH_HANS: Strings = {
  appName: '風',
  empty_title: '还没有站点',
  empty_subtitle: '添加住宅或办公室，结合卫星影像生成风水报告。',
  empty_cta: '添加站点',
  new_site_address_title: '选择地址',
  new_site_address_subtitle: '搜索或长按地图落点。',
  new_site_address_placeholder: '街道、城市、国家',
  new_site_address_geocode_error: '无法解析该地址的坐标，请使用「当前定位」或修改地址。',
  new_site_address_geocoding: '正在查询位置…',
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
  report_loading: '正在加载报告…',
  report_failed: '分析失败：{message}',
  report_pending: '尚未生成 — 点击站点开始分析。',
  report_chapter_pager_hint: '左右滑动逐章阅读。',
  report_data_quality_footer: '部分输入是估算值，可随时用更准的数据重新分析。',
  report_map_close: '近景',
  report_map_mid: '周边',
  report_map_wide: '全景',
  report_map_loading: '地图渲染中…',
  report_map_failed: '地图加载失败',
  new_site_review_ai_disclaimer:
    '我们会渲染带标注的卫星图，并对其运行 AI 视觉模型来识别形煞 / 砂 / 水。图像仅一次性处理，生成报告后不会保留。',
  new_site_review_iap_note: '每个地点一份报告。Pro 会员消耗月度配额；非会员可单次购买解锁此地点。',
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
  cancel: '取消',
  birth_info_title: '生辰信息',
  birth_info_subtitle: '用于风水报告中的八字 / 命卦章节，安全保存在你的账号下。',
  birth_date_label: '公历生日',
  birth_time_label: '出生时辰',
  birth_time_unknown: '时辰不详',
  birth_gender_label: '性别',
  birth_city_label: '出生城市',
  birth_city_placeholder: '输入出生城市',
  birth_city_required: '请从列表中选择出生城市。',
  birth_save: '保存',
  birth_saving: '保存中…',
  share_chapter: '分享',
  share_pending: '分享中…',
  share_needs_signin: '登录后即可分享章节。',
  err_generic: '出错了，请稍后再试。',
  chat_title: '聊聊这份风水报告',
  chat_empty: '关于这份风水报告，问我任何问题。',
  chat_placeholder: '输入你的问题…',
  chat_loading: '正在思考…',
  chat_error: '出错了，请稍后再试。',
  chat_pro_unlimited: 'Fēng Pro · 无限畅聊',
  chat_buy_credits: '对话次数已用完 — 点此获取更多。',
  chat_free_remaining: '还剩 {remaining} 次免费回复',
  chat_pool_remaining: '本月还剩 {remaining} 次回复',
  chat_pro_required: 'AI 对话是 Fēng Pro 功能。',
  chat_cta: '聊聊这份报告',
  chat_suggest_1: '财位怎么催旺？',
  chat_suggest_2: '我该先化解什么？',
  chat_suggest_3: '哪个方位最适合我？',
  privacy_section: '隐私',
  cross_app_memory_label: '跨应用记忆',
  cross_app_memory_hint: '允许对话参考你在所有 HexAstral 应用中的解读。仅限同一账户，绝不外泄。',
}

const ZH_HANT: Strings = {
  ...ZH_HANS,
  appName: '風',
  empty_title: '尚未新增地點',
  empty_subtitle: '加入住家或辦公室，結合衛星影像生成風水報告。',
  empty_cta: '新增地點',
  new_site_address_title: '選擇地址',
  new_site_address_subtitle: '搜尋或長按地圖標示位置。',
  new_site_address_geocode_error: '無法解析此地址的座標，請使用「目前位置」或修改地址。',
  new_site_address_geocoding: '正在查詢位置…',
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
  report_loading: '正在載入報告…',
  report_failed: '分析失敗：{message}',
  report_pending: '尚未生成 — 點選地點開始分析。',
  report_chapter_pager_hint: '左右滑動逐章閱讀。',
  report_data_quality_footer: '部分輸入為估算，可隨時用更準的資料重新分析。',
  report_map_close: '近景',
  report_map_mid: '周邊',
  report_map_wide: '全景',
  report_map_loading: '地圖渲染中…',
  report_map_failed: '地圖載入失敗',
  new_site_review_ai_disclaimer:
    '我們會渲染帶標註的衛星圖，並對其運行 AI 視覺模型來識別形煞 / 砂 / 水。圖像僅一次性處理，生成報告後不會保留。',
  new_site_review_iap_note: '每個地點一份報告。Pro 會員消耗月度配額；非會員可單次購買解鎖此地點。',
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
  cancel: '取消',
  birth_info_title: '生辰資訊',
  birth_info_subtitle: '用於風水報告中的八字／命卦章節，安全保存在你的帳號下。',
  birth_date_label: '公曆生日',
  birth_time_label: '出生時辰',
  birth_time_unknown: '時辰不詳',
  birth_gender_label: '性別',
  birth_city_label: '出生城市',
  birth_city_placeholder: '輸入出生城市',
  birth_city_required: '請從列表中選擇出生城市。',
  birth_save: '儲存',
  birth_saving: '儲存中…',
  share_chapter: '分享',
  share_pending: '分享中…',
  share_needs_signin: '登入後即可分享章節。',
  err_generic: '發生錯誤，請稍後再試。',
  chat_title: '聊聊這份風水報告',
  chat_empty: '關於這份風水報告，問我任何問題。',
  chat_placeholder: '輸入你的問題…',
  chat_loading: '正在思考…',
  chat_error: '發生錯誤，請稍後再試。',
  chat_pro_unlimited: 'Fēng Pro · 無限暢聊',
  chat_buy_credits: '對話次數已用完 — 點此取得更多。',
  chat_free_remaining: '還剩 {remaining} 次免費回覆',
  chat_pool_remaining: '本月還剩 {remaining} 次回覆',
  chat_pro_required: 'AI 對話是 Fēng Pro 功能。',
  chat_cta: '聊聊這份報告',
  chat_suggest_1: '財位怎麼催旺？',
  chat_suggest_2: '我該先化解什麼？',
  chat_suggest_3: '哪個方位最適合我？',
  privacy_section: '隱私',
  cross_app_memory_label: '跨應用記憶',
  cross_app_memory_hint: '允許對話參考你在所有 HexAstral 應用中的解讀。僅限同一帳號，絕不外洩。',
}

const JA: Strings = {
  ...EN,
  appName: '風',
  empty_title: 'まだ場所が登録されていません',
  empty_subtitle: '自宅やオフィスを追加すると、衛星画像に基づいた風水レポートを生成できます。',
  empty_cta: '場所を追加',
  new_site_address_title: '住所を選ぶ',
  new_site_address_subtitle: '検索するか地図を長押ししてピンを置きます。',
  new_site_address_geocode_error:
    '住所から座標を取得できませんでした。「現在地を使う」か住所を修正してください。',
  new_site_address_geocoding: '位置を検索中…',
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
  report_loading: 'レポートを読み込み中…',
  report_failed: '分析失敗：{message}',
  report_pending: 'まだ分析されていません — 場所をタップして開始します。',
  report_chapter_pager_hint: '左右にスワイプして章を読みます。',
  report_data_quality_footer: '一部の入力は推定値です。より正確なデータでいつでも再分析できます。',
  report_map_close: '近景',
  report_map_mid: '周辺',
  report_map_wide: '全景',
  report_map_loading: '地図を生成中…',
  report_map_failed: '地図を読み込めません',
  new_site_review_ai_disclaimer:
    '注釈付き衛星画像を生成し、AI ビジョンモデルで形煞 / 砂 / 水を識別します。画像は一度だけ処理され、レポート生成後は保存されません。',
  new_site_review_iap_note:
    '1 地点につき 1 レポート。Pro 会員は月間クォータを消費、それ以外は単発購入でこの地点を解放できます。',
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
  cancel: 'キャンセル',
  birth_info_title: '生年月日',
  birth_info_subtitle: '風水レポートの八字・命卦章に使用します。アカウントに安全に保存されます。',
  birth_date_label: '西暦の生年月日',
  birth_time_label: '出生時刻（十二支）',
  birth_time_unknown: '時刻不明',
  birth_gender_label: '性別',
  birth_city_label: '出生地',
  birth_city_placeholder: '出生地の都市',
  birth_city_required: 'リストから出生地を選んでください。',
  birth_save: '保存',
  birth_saving: '保存中…',
  share_chapter: '共有',
  share_pending: '共有中…',
  share_needs_signin: 'ログインして章を共有します。',
  err_generic: 'エラーが発生しました。もう一度お試しください。',
  chat_title: 'このレポートについて聞く',
  chat_empty: '風水レポートについて何でも聞いてください。',
  chat_placeholder: '質問を入力…',
  chat_loading: '考えています…',
  chat_error: 'エラーが発生しました。もう一度お試しください。',
  chat_pro_unlimited: 'Fēng Pro · 無制限',
  chat_buy_credits: 'チャット回数を使い切りました — タップで追加。',
  chat_free_remaining: '無料の返信があと {remaining} 回',
  chat_pool_remaining: '今月の返信があと {remaining} 回',
  chat_pro_required: 'AI チャットは Fēng Pro の機能です。',
  chat_cta: 'このレポートについて聞く',
  chat_suggest_1: '財方位を強めるには？',
  chat_suggest_2: 'まず何を直すべき？',
  chat_suggest_3: '私に最も合う方位は？',
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
