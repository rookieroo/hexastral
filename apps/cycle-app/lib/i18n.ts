/**
 * Cycle i18n — 4 locales out of the gate (ADR-0010 §3): zh-Hans / zh-Hant / ja / en.
 *
 * Scope note (v1): UI chrome + event taxonomy + 建除 glosses are fully translated.
 * The 黄历 domain vocabulary returned by the API (宿名 / 宜忌 verbs) renders as the
 * source CJK term — fine for zh/ja (shared kanji); a full en/ja 宜忌 glossary is a
 * content task tracked alongside C.2.5 / C.1.7.
 */

import { getLocales } from 'expo-localization'
import type { CycleEvent, DayOfficer, PersonalFit, PersonalReasonCode } from './api'

export type Locale = 'zh-Hans' | 'zh-Hant' | 'ja' | 'en'

export interface Strings {
  appName: string
  todayTab: string
  monthTab: string
  festivalsTab: string
  meTab: string
  today: string
  suitable: string
  avoid: string
  clash: string
  evilDirection: string
  dutyMansion: string
  dayOfficerLabel: string
  solarTerm: string
  auspiciousHours: string
  ratingLabel: string
  // event search
  eventSearch: string
  pickEvent: string
  from: string
  to: string
  search: string
  recommended: string
  noResults: string
  searching: string
  loadFailed: string
  retry: string
  // me
  settings: string
  language: string
  dailyPush: string
  privacy: string
  terms: string
  // navigation / discovery
  openMonth: string
  discover: string
  // Sprint 2 Tier-1 hero enrichments
  /** Label for the 本命年 emphasis on the year chip (Tier-1 #10). */
  benming: string
  /** Meta-row label for the next 节气 with instant (Tier-1 #7). */
  nextSolarTerm: string
  /** Inline label preceding 农历 month+day on the hero date row (Tier-1 #8). */
  lunarLabel: string
  /** Warning label on the hero when today's day-branch clashes with user's birth-year branch (Tier-1 #5b). */
  personalClashLabel: string
  // Sprint 2 Pro split + paywall (chunk 8)
  /** "+N" footer chip beneath YiJiBlock when items are gated behind Pro. */
  unlockMore: string
  /** Paywall sheet title. */
  proTitle: string
  /** Paywall sheet subtitle / what Pro unlocks. */
  proSubtitle: string
  /** Plan label for the monthly subscription. */
  proMonthly: string
  /** Plan label for the annual subscription. */
  proAnnual: string
  /** Restore-purchases row label. */
  proRestore: string
  /** Indicator on /event when specialized scoring is active (Pro + a specialized event). */
  specializedActive: string
  /** Upsell pill on /event when user picks a specialized event but isn't Pro yet. */
  specializedUpsell: string
  // Sprint 2 dual-timezone (chunk 6, Tier-1 #9)
  /** Me section title for the dual-timezone setting. */
  remoteTzSection: string
  /** Placeholder hint for the offset-hours TextInput (e.g. "+8" / "-5"). */
  remoteTzOffsetHint: string
  /** Placeholder hint for the city label TextInput (e.g. "Beijing"). */
  remoteTzCityHint: string
  /** Save button label in the Me dual-tz section. */
  remoteTzSave: string
  /** Clear button label in the Me dual-tz section. */
  remoteTzClear: string
  /** Inline "is now" word for the Today banner ({label} {remoteTzNow} {date}). */
  remoteTzNow: string
  // Sprint 3 chunk 1 — /festivals foundation
  /** Compact label for the 节庆 row on Today's drill-in nav + as the /festivals page title. */
  openFestivals: string
  /** Home drill-in label for the merged culture hub (节气/节日/词条 wiki). */
  cultureHub: string
  /** Section label above the home culture snippet card (festival / 节气 days). */
  cultureSnippetTitle: string
  /** CTA on the home culture snippet card → `/festival/[id]`. */
  cultureReadMore: string
  /** Tagline when the card previews the upcoming 节气 (not term day). */
  cultureUpcomingTerm: string
  /** Home section label above the six-topic culture grid. */
  cultureTopicsTitle: string
  /** Link label opening Wikipedia in the browser. */
  cultureWikipediaCta: string
  /** Ziwei section — interactive chart not shipped yet. */
  ziweiChartComingSoon: string
  /** Season group labels for the 节气 accordion on the culture hub. */
  seasonSpring: string
  seasonSummer: string
  seasonAutumn: string
  seasonWinter: string
  /** Section label above the 24 节气 horizontal timeline. */
  solarTermsSection: string
  /** Section label above the 8 festivals card list. */
  festivalsSection: string
  /** Section label above the family-events placeholder. */
  familyEventsSection: string
  /** Placeholder copy in the family-events section. Family-events backend ships Sprint 4. */
  familyEventsComingSoon: string
  /** Placeholder card on the festival detail page when content isn't authored yet. */
  contentComingSoon: string
  /** Pro upsell row beneath a Free-truncated section body on the detail page. */
  unlockFullSection: string
  /** Animated swipe-left hint at the bottom of Today (paired with a left-pointing arrow). */
  swipeMeHint: string
  // ── Educational glossary (ADR-0020, Sprint 3 scaffold) ────────────────────
  /** Top-level glossary section title. Also the entry-row label in Me. */
  glossaryTitle: string
  // ── Honest For-you (Sprint 3.5 / ADR-0020) ─────────────────────────────
  /** Body copy on the "set birth info" placeholder shown when no birth is set. */
  personalEmptyBody: string
  /** CTA on the placeholder — taps to Me to set birth info. */
  personalEmptyCta: string
  // ── 十二时辰 wheel (Glossary chunk 1 / ADR-0020) ────────────────────────
  /** Badge on the currently-active 时辰 inside the wheel. */
  shichenWheelActive: string
  /** Field label preceding the meridian / organ name on the detail card. */
  shichenWheelOrgan: string
  // ── Life Timeline (Sprint 4.5 / ADR-0020) ───────────────────────────────
  /** Title of the /timeline Pro page. */
  timelineTitle: string
  /** Label for 大运 (10-year cycle) section + chip header. */
  timelineDayun: string
  /** Label for 流年 (yearly) section. */
  timelineLiunian: string
  /** Label for 流月 (monthly) section. */
  timelineLiuyue: string
  /** Badge text on the currently-active row in any timeline section. */
  timelineCurrentBadge: string
  /** Age-range label fragment — pass {age} as a template token. */
  timelineAgeFrom: string
  /** Paywall CTA shown beneath the first-3 大运 teaser for Free users. */
  timelineProLocked: string
  /** Compact label for the LiuyearBanner on Today (above the hero). */
  timelineBannerHint: string
  // ── 干支 grid (Glossary chunk 2 / ADR-0020) ─────────────────────────────
  /** Section label above the 10 天干 strip. */
  ganzhiStemsTitle: string
  /** Section label above the 12 地支 strip. */
  ganzhiBranchesTitle: string
  /** Section label above the 60-甲子 paired grid. */
  ganzhiSixtyTitle: string
  /** Field label preceding the matching gregorian year in the detail card. */
  ganzhiYearLabel: string
  /** 60-甲子 detail card — `{index}` is 1..60. */
  ganzhiComboIndex: string
  // ── 四柱八字 personalized page (Glossary chunk 3 / ADR-0020) ────────────
  /** Column header for 年柱 (year pillar). */
  baziPillarYear: string
  /** Column header for 月柱 (month pillar). */
  baziPillarMonth: string
  /** Column header for 日柱 (day pillar — carries the 日主). */
  baziPillarDay: string
  /** Column header for 时柱 (hour pillar). */
  baziPillarHour: string
  /** Caption beneath the day pillar identifying the 日主 (Day Master). */
  baziDayMaster: string
  /** Section label above the 五行 distribution bars. */
  baziElementBalance: string
  /** Placeholder text on the hour pillar when birth hour is unknown. */
  baziHourUnknown: string
  /** Section: 十二时辰 (12 traditional hours). */
  glossaryShichen: string
  /** Section: 天干地支 (10 stems + 12 branches). */
  glossaryGanzhi: string
  /** Section: 四柱八字 (Four Pillars). */
  glossarySizhu: string
  /** Section: 紫微星盘 (Ziwei chart). */
  glossaryZiwei: string
  // Birth-info form (single-page, in Me — Sprint 3 chunk 8)
  birthDateLabel: string
  birthShichenLabel: string
  birthShichenUnknown: string
  birthGenderLabel: string
  birthGenderMale: string
  birthGenderFemale: string
  birthCityLabel: string
  birthCityPlaceholder: string
  birthSave: string
  birthSaved: string
  events: Record<CycleEvent, string>
  officers: Record<DayOfficer, string>
  personal: {
    forYou: string
    fit: Record<PersonalFit, string>
    /** Free one-line fortune read per verdict — the natural takeaway. The per-reason "why" stays Pro. */
    summary: Record<PersonalFit, string>
    /** Quiet CTA that opens the Pro reading ("see why"). */
    why: string
    reason: Record<PersonalReasonCode, string>
    setBirth: string
    birthDatePlaceholder: string
    birthHint: string
  }
  people: {
    title: string
    add: string
    name: string
    namePlaceholder: string
    date: string
    yearOptional: string
    solar: string
    lunar: string
    advance: string
    dayUnit: string
    noAdvance: string
    remindOnDay: string
    reminderHint: string
    submit: string
    empty: string
    delete: string
    relation: string
    self: string
    needBirth: string
    needBirthBody: string
    homeEntry: string
  }
  watchWidgets: string
}

const zhHans: Strings = {
  appName: 'Cycle 黄历',
  todayTab: '今',
  monthTab: '月',
  festivalsTab: '节',
  meTab: '我',
  today: '今日',
  suitable: '宜',
  avoid: '忌',
  clash: '冲',
  evilDirection: '煞',
  dutyMansion: '值日星宿',
  dayOfficerLabel: '值神',
  solarTerm: '节气',
  auspiciousHours: '时辰',
  ratingLabel: '评级',
  eventSearch: '选择日子',
  pickEvent: '选择事项',
  from: '起',
  to: '止',
  search: '查询',
  recommended: '推荐',
  noResults: '此区间未找到合适的日子',
  searching: '正在推算…',
  loadFailed: '加载失败',
  retry: '重试',
  settings: '设置',
  language: '语言',
  dailyPush: '每日提醒',
  privacy: '隐私政策',
  terms: '使用条款',
  openMonth: '月历',
  discover: '探索矩阵',
  benming: '本命年',
  nextSolarTerm: '下一节气',
  lunarLabel: '农历',
  personalClashLabel: '今日冲你',
  unlockMore: '解锁更多',
  proTitle: 'Cycle Pro',
  proSubtitle: '对你而言逐条解读 · 大运流年 · 4 项专项择日 (嫁娶/入宅/开市/出行)',
  proMonthly: '月度订阅',
  proAnnual: '年度订阅',
  proRestore: '恢复购买',
  specializedActive: '专项择日 已启用',
  specializedUpsell: 'Pro · 解锁专项择日',
  remoteTzSection: '外地时区',
  remoteTzOffsetHint: '时差 (例 +8 / -5)',
  remoteTzCityHint: '城市 (可选)',
  remoteTzSave: '保存',
  remoteTzClear: '清除',
  remoteTzNow: '已是',
  openFestivals: '节庆',
  cultureHub: '文化',
  cultureSnippetTitle: '今日文化',
  cultureReadMore: '阅读全文',
  cultureUpcomingTerm: '即将到来 · {name}',
  cultureTopicsTitle: '文化百科',
  cultureWikipediaCta: '在维基百科了解更多',
  ziweiChartComingSoon: '星盘排盘功能即将上线',
  seasonSpring: '春',
  seasonSummer: '夏',
  seasonAutumn: '秋',
  seasonWinter: '冬',
  solarTermsSection: '二十四节气',
  festivalsSection: '八大节日',
  familyEventsSection: '家庭事件',
  familyEventsComingSoon: 'Sprint 4 上线',
  contentComingSoon: '内容编辑中',
  unlockFullSection: '解锁完整章节',
  swipeMeHint: '设置',
  glossaryTitle: '科普',
  glossaryShichen: '十二时辰',
  glossaryGanzhi: '天干地支',
  glossarySizhu: '四柱八字',
  glossaryZiwei: '紫微星盘',
  personalEmptyBody: '添加生辰即可看到「对你而言」的个性化解读',
  personalEmptyCta: '设置生辰',
  shichenWheelActive: '现在',
  shichenWheelOrgan: '经络',
  timelineTitle: '人生时间线',
  timelineDayun: '大运',
  timelineLiunian: '流年',
  timelineLiuyue: '流月',
  timelineCurrentBadge: '当前',
  timelineAgeFrom: '{age} 岁起',
  timelineProLocked: '解锁完整人生时间线',
  timelineBannerHint: '大运 · 流年',
  ganzhiStemsTitle: '十天干',
  ganzhiBranchesTitle: '十二地支',
  ganzhiSixtyTitle: '六十甲子',
  ganzhiYearLabel: '最近一次',
  ganzhiComboIndex: '第 {index} / 60',
  baziPillarYear: '年柱',
  baziPillarMonth: '月柱',
  baziPillarDay: '日柱',
  baziPillarHour: '时柱',
  baziDayMaster: '日主',
  baziElementBalance: '五行分布',
  baziHourUnknown: '时辰未填',
  birthDateLabel: '出生日期',
  birthShichenLabel: '出生时辰',
  birthShichenUnknown: '未知',
  birthGenderLabel: '性别',
  birthGenderMale: '男',
  birthGenderFemale: '女',
  birthCityLabel: '出生地（可选）',
  birthCityPlaceholder: '城市',
  birthSave: '保存',
  birthSaved: '已保存',
  events: {
    wedding: '嫁娶',
    business: '开市',
    signing: '签约',
    move: '搬迁',
    'move-in': '入宅',
    travel: '出行',
    burial: '安葬',
    groundbreaking: '动土',
    medical: '求医',
    study: '入学',
  },
  officers: {
    建: '建',
    除: '除',
    满: '满',
    平: '平',
    定: '定',
    执: '执',
    破: '破',
    危: '危',
    成: '成',
    收: '收',
    开: '开',
    闭: '闭',
  },
  personal: {
    forYou: '对你而言',
    fit: { 吉: '宜把握', 平: '平稳', 凶: '宜谨慎' },
    summary: {
      吉: '今天气场顺遂，适合主动推进想做的事。',
      平: '今天起伏不大，按计划稳步推进即可。',
      凶: '今天宜守不宜攻，低调收敛、避免冒进。',
    },
    why: '了解原因',
    reason: {
      day_generates_self: '今日五行生扶你，宜把握时机',
      day_controls_self: '今日五行克你，宜守不宜攻',
      self_generates_day: '今日略泄你的精力，量力而行',
      self_controls_day: '今日你能掌控局面，可主动出击',
      day_same_as_self: '今日与你同气，平稳有助力',
      favorable_element_present: '今日五行正是你的用神，格外有利',
      unfavorable_element_present: '今日五行为你的忌神，谨慎为宜',
      personal_clash: '今日冲你的生肖，避免重大决定',
    },
    setBirth: '设置出生日期',
    birthDatePlaceholder: 'YYYY-MM-DD',
    birthHint: '用于「对你而言」个性化',
  },
  people: {
    title: '亲友生日',
    add: '添加亲友',
    name: '称呼',
    namePlaceholder: '妈妈 / 阿明',
    date: '生日',
    yearOptional: '出生年份（可选）',
    solar: '阳历',
    lunar: '农历',
    advance: '提前提醒',
    dayUnit: '天',
    noAdvance: '不提前',
    remindOnDay: '当天也提醒',
    reminderHint: '生日前会准时提醒你',
    submit: '添加',
    empty: '还没有亲友。添加后，会在生日前提醒你。',
    delete: '删除',
    relation: '关系',
    self: '我',
    needBirth: '需要你的生辰',
    needBirthBody: '请先在设置里填写你的生辰，才能查看与 TA 的关系。',
    homeEntry: '记录生日',
  },
  watchWidgets: '表盘与桌面组件',
}

const zhHant: Strings = {
  ...zhHans,
  appName: 'Cycle 黃曆',
  festivalsTab: '節',
  dutyMansion: '值日星宿',
  dayOfficerLabel: '值神',
  solarTerm: '節氣',
  eventSearch: '選擇日子',
  pickEvent: '選擇事項',
  search: '查詢',
  recommended: '推薦',
  noResults: '此區間未找到合適的日子',
  searching: '正在推算…',
  loadFailed: '載入失敗',
  settings: '設定',
  language: '語言',
  dailyPush: '每日提醒',
  privacy: '隱私政策',
  terms: '使用條款',
  openMonth: '月曆',
  discover: '探索矩陣',
  benming: '本命年',
  nextSolarTerm: '下一節氣',
  lunarLabel: '農曆',
  personalClashLabel: '今日沖你',
  unlockMore: '解鎖更多',
  proTitle: 'Cycle Pro',
  proSubtitle: '對你而言逐條解讀 · 大運流年 · 4 項專項擇日 (嫁娶/入宅/開市/出行)',
  proMonthly: '月度訂閱',
  proAnnual: '年度訂閱',
  proRestore: '恢復購買',
  specializedActive: '專項擇日 已啟用',
  specializedUpsell: 'Pro · 解鎖專項擇日',
  remoteTzSection: '外地時區',
  remoteTzOffsetHint: '時差 (例 +8 / -5)',
  remoteTzCityHint: '城市 (可選)',
  remoteTzSave: '保存',
  remoteTzClear: '清除',
  remoteTzNow: '已是',
  openFestivals: '節慶',
  cultureHub: '文化',
  cultureSnippetTitle: '今日文化',
  cultureReadMore: '閱讀全文',
  cultureUpcomingTerm: '即將到來 · {name}',
  cultureTopicsTitle: '文化百科',
  cultureWikipediaCta: '在維基百科了解更多',
  ziweiChartComingSoon: '星盤排盤功能即將上線',
  seasonSpring: '春',
  seasonSummer: '夏',
  seasonAutumn: '秋',
  seasonWinter: '冬',
  solarTermsSection: '二十四節氣',
  festivalsSection: '八大節日',
  familyEventsSection: '家庭事件',
  familyEventsComingSoon: 'Sprint 4 上線',
  contentComingSoon: '內容編輯中',
  unlockFullSection: '解鎖完整章節',
  swipeMeHint: '設定',
  glossaryTitle: '科普',
  glossaryShichen: '十二時辰',
  glossaryGanzhi: '天干地支',
  glossarySizhu: '四柱八字',
  glossaryZiwei: '紫微星盤',
  personalEmptyBody: '添加生辰即可看到「對你而言」的個性化解讀',
  personalEmptyCta: '設定生辰',
  shichenWheelActive: '現在',
  shichenWheelOrgan: '經絡',
  timelineTitle: '人生時間線',
  timelineDayun: '大運',
  timelineLiunian: '流年',
  timelineLiuyue: '流月',
  timelineCurrentBadge: '當前',
  timelineAgeFrom: '{age} 歲起',
  timelineProLocked: '解鎖完整人生時間線',
  timelineBannerHint: '大運 · 流年',
  ganzhiStemsTitle: '十天干',
  ganzhiBranchesTitle: '十二地支',
  ganzhiSixtyTitle: '六十甲子',
  ganzhiYearLabel: '最近一次',
  ganzhiComboIndex: '第 {index} / 60',
  baziPillarYear: '年柱',
  baziPillarMonth: '月柱',
  baziPillarDay: '日柱',
  baziPillarHour: '時柱',
  baziDayMaster: '日主',
  baziElementBalance: '五行分佈',
  baziHourUnknown: '時辰未填',
  birthDateLabel: '出生日期',
  birthShichenLabel: '出生時辰',
  birthShichenUnknown: '未知',
  birthGenderLabel: '性別',
  birthGenderMale: '男',
  birthGenderFemale: '女',
  birthCityLabel: '出生地（可選）',
  birthCityPlaceholder: '城市',
  birthSave: '保存',
  birthSaved: '已保存',
  events: {
    wedding: '嫁娶',
    business: '開市',
    signing: '簽約',
    move: '搬遷',
    'move-in': '入宅',
    travel: '出行',
    burial: '安葬',
    groundbreaking: '動土',
    medical: '求醫',
    study: '入學',
  },
  personal: {
    forYou: '對你而言',
    fit: { 吉: '宜把握', 平: '平穩', 凶: '宜謹慎' },
    summary: {
      吉: '今天氣場順遂，適合主動推進想做的事。',
      平: '今天起伏不大，按計畫穩步推進即可。',
      凶: '今天宜守不宜攻，低調收斂、避免冒進。',
    },
    why: '了解原因',
    reason: {
      day_generates_self: '今日五行生扶你，宜把握時機',
      day_controls_self: '今日五行剋你，宜守不宜攻',
      self_generates_day: '今日略洩你的精力，量力而行',
      self_controls_day: '今日你能掌控局面，可主動出擊',
      day_same_as_self: '今日與你同氣，平穩有助力',
      favorable_element_present: '今日五行正是你的用神，格外有利',
      unfavorable_element_present: '今日五行為你的忌神，謹慎為宜',
      personal_clash: '今日沖你的生肖，避免重大決定',
    },
    setBirth: '設定出生日期',
    birthDatePlaceholder: 'YYYY-MM-DD',
    birthHint: '用於「對你而言」個性化',
  },
  people: {
    title: '親友生日',
    add: '新增親友',
    name: '稱呼',
    namePlaceholder: '媽媽 / 阿明',
    date: '生日',
    yearOptional: '出生年份（可選）',
    solar: '陽曆',
    lunar: '農曆',
    advance: '提前提醒',
    dayUnit: '天',
    noAdvance: '不提前',
    remindOnDay: '當天也提醒',
    reminderHint: '生日前會準時提醒你',
    submit: '新增',
    empty: '還沒有親友。新增後，會在生日前提醒你。',
    delete: '刪除',
    relation: '關係',
    self: '我',
    needBirth: '需要你的生辰',
    needBirthBody: '請先在設定裡填寫你的生辰，才能查看與 TA 的關係。',
    homeEntry: '記錄生日',
  },
  watchWidgets: '錶盤與桌面元件',
}

const ja: Strings = {
  appName: 'Cycle 暦',
  todayTab: '今日',
  monthTab: '月',
  festivalsTab: '節句',
  meTab: '私',
  today: '本日',
  suitable: '宜',
  avoid: '忌',
  clash: '冲',
  evilDirection: '殺',
  dutyMansion: '二十八宿',
  dayOfficerLabel: '十二直',
  solarTerm: '節気',
  auspiciousHours: '時辰',
  ratingLabel: '評価',
  eventSearch: '日選び',
  pickEvent: '用件を選ぶ',
  from: '開始',
  to: '終了',
  search: '検索',
  recommended: 'おすすめ',
  noResults: 'この期間に適した日は見つかりません',
  searching: '計算中…',
  loadFailed: '読み込み失敗',
  retry: '再試行',
  settings: '設定',
  language: '言語',
  dailyPush: '毎日の通知',
  privacy: 'プライバシー',
  terms: '利用規約',
  openMonth: 'カレンダー',
  discover: 'ほかのアプリ',
  benming: '本命年',
  nextSolarTerm: '次の節気',
  lunarLabel: '旧暦',
  personalClashLabel: '本日と冲',
  unlockMore: 'もっと見る',
  proTitle: 'Cycle Pro',
  proSubtitle: 'あなたへの個別解説 · 大運・流年 · 4 種の専門日選び',
  proMonthly: '月額プラン',
  proAnnual: '年額プラン',
  proRestore: '購入を復元',
  specializedActive: '専門日選び 適用中',
  specializedUpsell: 'Pro · 専門日選びを解錠',
  remoteTzSection: '現地時間',
  remoteTzOffsetHint: '時差 (例 +8 / -5)',
  remoteTzCityHint: '都市名（任意）',
  remoteTzSave: '保存',
  remoteTzClear: 'クリア',
  remoteTzNow: 'は',
  openFestivals: '節句',
  cultureHub: '文化',
  cultureSnippetTitle: '今日の文化',
  cultureReadMore: '全文を読む',
  cultureUpcomingTerm: 'まもなく · {name}',
  cultureTopicsTitle: '文化百科',
  cultureWikipediaCta: 'ウィキペディアで詳しく',
  ziweiChartComingSoon: '星盤チャートは近日公開',
  seasonSpring: '春',
  seasonSummer: '夏',
  seasonAutumn: '秋',
  seasonWinter: '冬',
  solarTermsSection: '二十四節気',
  festivalsSection: '八大節句',
  familyEventsSection: '家族イベント',
  familyEventsComingSoon: 'Sprint 4 で予定',
  contentComingSoon: 'コンテンツ準備中',
  unlockFullSection: '全文を解錠',
  swipeMeHint: '設定',
  glossaryTitle: '読み物',
  glossaryShichen: '十二時辰',
  glossaryGanzhi: '十干十二支',
  glossarySizhu: '四柱推命',
  glossaryZiwei: '紫微斗数',
  personalEmptyBody: '生年月日を入力すると「あなたへ」の個別化が表示されます',
  personalEmptyCta: '生年月日を設定',
  shichenWheelActive: '今',
  shichenWheelOrgan: '経絡',
  timelineTitle: '人生タイムライン',
  timelineDayun: '大運',
  timelineLiunian: '流年',
  timelineLiuyue: '流月',
  timelineCurrentBadge: '現在',
  timelineAgeFrom: '{age} 歳から',
  timelineProLocked: '人生タイムラインを全期間解錠',
  timelineBannerHint: '大運 · 流年',
  ganzhiStemsTitle: '十干',
  ganzhiBranchesTitle: '十二支',
  ganzhiSixtyTitle: '六十干支',
  ganzhiYearLabel: '直近の年',
  ganzhiComboIndex: '{index} / 60',
  baziPillarYear: '年柱',
  baziPillarMonth: '月柱',
  baziPillarDay: '日柱',
  baziPillarHour: '時柱',
  baziDayMaster: '日主',
  baziElementBalance: '五行バランス',
  baziHourUnknown: '時辰未入力',
  birthDateLabel: '生年月日',
  birthShichenLabel: '生まれた時辰',
  birthShichenUnknown: '不明',
  birthGenderLabel: '性別',
  birthGenderMale: '男性',
  birthGenderFemale: '女性',
  birthCityLabel: '出生地（任意）',
  birthCityPlaceholder: '都市名',
  birthSave: '保存',
  birthSaved: '保存しました',
  events: {
    wedding: '結婚',
    business: '開業',
    signing: '契約',
    move: '引越し',
    'move-in': '入居',
    travel: '旅行',
    burial: '葬儀',
    groundbreaking: '起工',
    medical: '治療',
    study: '入学',
  },
  officers: zhHans.officers,
  personal: {
    forYou: 'あなたへ',
    fit: { 吉: '好機', 平: '平穏', 凶: '慎重に' },
    summary: {
      吉: '今日は流れが良く、やりたいことを進めるのに向いています。',
      平: '今日は起伏が少なく、計画どおり着実に進めれば十分です。',
      凶: '今日は攻めより守り。控えめに、無理は避けましょう。',
    },
    why: '理由を見る',
    reason: {
      day_generates_self: '本日の五行があなたを生じ、好機です',
      day_controls_self: '本日の五行があなたを剋す、守りを',
      self_generates_day: '本日は気を消耗しがち、無理せず',
      self_controls_day: '本日は主導権を握れます',
      day_same_as_self: '本日はあなたと同気、安定',
      favorable_element_present: '本日の五行はあなたの用神、好都合',
      unfavorable_element_present: '本日の五行は忌神、慎重に',
      personal_clash: '本日はあなたの干支と冲、大事は避けて',
    },
    setBirth: '生年月日を設定',
    birthDatePlaceholder: 'YYYY-MM-DD',
    birthHint: '「あなたへ」の個別化に使用',
  },
  people: {
    title: '記念日',
    add: '追加',
    name: '呼び名',
    namePlaceholder: '母 / たろう',
    date: '誕生日',
    yearOptional: '生年（任意）',
    solar: '新暦',
    lunar: '旧暦',
    advance: '事前通知',
    dayUnit: '日',
    noAdvance: 'なし',
    remindOnDay: '当日も通知',
    reminderHint: '誕生日の前にお知らせします',
    submit: '追加',
    empty: 'まだ登録がありません。追加すると誕生日前に通知します。',
    delete: '削除',
    relation: '相性',
    self: '私',
    needBirth: '生年月日が必要',
    needBirthBody: '相性を見るには、設定であなたの生年月日を入力してください。',
    homeEntry: '記念日を追加',
  },
  watchWidgets: '文字盤とウィジェット',
}

const en: Strings = {
  appName: 'Cycle Almanac',
  todayTab: 'Today',
  monthTab: 'Month',
  festivalsTab: 'Festivals',
  meTab: 'Me',
  today: 'Today',
  suitable: 'Good for',
  avoid: 'Avoid',
  clash: 'Clash',
  evilDirection: 'Ill dir.',
  dutyMansion: 'Mansion',
  dayOfficerLabel: 'Day officer',
  solarTerm: 'Solar term',
  auspiciousHours: 'Hours',
  ratingLabel: 'Rating',
  eventSearch: 'Find a date',
  pickEvent: 'Pick an event',
  from: 'From',
  to: 'To',
  search: 'Search',
  recommended: 'Recommended',
  noResults: 'No suitable day found in this window',
  searching: 'Calculating…',
  loadFailed: 'Failed to load',
  retry: 'Retry',
  settings: 'Settings',
  language: 'Language',
  dailyPush: 'Daily reminder',
  privacy: 'Privacy',
  terms: 'Terms',
  openMonth: 'Calendar',
  discover: 'Discover',
  benming: 'Benming yr',
  nextSolarTerm: 'Next term',
  lunarLabel: 'Lunar',
  personalClashLabel: 'Clashes today',
  unlockMore: 'Unlock more',
  proTitle: 'Cycle Pro',
  proSubtitle: 'Per-reason For-you reading · Life timeline · 4 specialized date pickers',
  proMonthly: 'Monthly',
  proAnnual: 'Annual',
  proRestore: 'Restore purchase',
  specializedActive: 'Specialized scoring on',
  specializedUpsell: 'Pro · unlock specialized scoring',
  remoteTzSection: 'Remote timezone',
  remoteTzOffsetHint: 'Hours offset (e.g. +8 / -5)',
  remoteTzCityHint: 'City (optional)',
  remoteTzSave: 'Save',
  remoteTzClear: 'Clear',
  remoteTzNow: 'is now',
  openFestivals: 'Festivals',
  cultureHub: 'Culture',
  cultureSnippetTitle: "Today's culture",
  cultureReadMore: 'Read more',
  cultureUpcomingTerm: 'Up next · {name}',
  cultureTopicsTitle: 'Culture guide',
  cultureWikipediaCta: 'Learn more on Wikipedia',
  ziweiChartComingSoon: 'Interactive chart coming soon',
  seasonSpring: 'Spring',
  seasonSummer: 'Summer',
  seasonAutumn: 'Autumn',
  seasonWinter: 'Winter',
  solarTermsSection: 'Solar terms',
  festivalsSection: '8 Festivals',
  familyEventsSection: 'Family events',
  familyEventsComingSoon: 'Coming in Sprint 4',
  contentComingSoon: 'Content coming soon',
  unlockFullSection: 'Unlock full section',
  swipeMeHint: 'Settings',
  glossaryTitle: 'Glossary',
  glossaryShichen: 'Twelve hours',
  glossaryGanzhi: 'Stems & branches',
  glossarySizhu: 'Four pillars',
  glossaryZiwei: 'Ziwei chart',
  personalEmptyBody: 'Add your birth info to unlock the "For you" personalization',
  personalEmptyCta: 'Set birth info',
  shichenWheelActive: 'Now',
  shichenWheelOrgan: 'Meridian',
  timelineTitle: 'Life timeline',
  timelineDayun: 'Decade',
  timelineLiunian: 'Year',
  timelineLiuyue: 'Month',
  timelineCurrentBadge: 'Now',
  timelineAgeFrom: 'From age {age}',
  timelineProLocked: 'Unlock the full life timeline',
  timelineBannerHint: 'Decade · Year',
  ganzhiStemsTitle: 'Ten Stems',
  ganzhiBranchesTitle: 'Twelve Branches',
  ganzhiSixtyTitle: 'Sixty Cycle',
  ganzhiYearLabel: 'Nearest year',
  ganzhiComboIndex: '{index} / 60',
  baziPillarYear: 'Year',
  baziPillarMonth: 'Month',
  baziPillarDay: 'Day',
  baziPillarHour: 'Hour',
  baziDayMaster: 'Day Master',
  baziElementBalance: 'Element balance',
  baziHourUnknown: 'Hour not set',
  birthDateLabel: 'Birth date',
  birthShichenLabel: 'Birth hour',
  birthShichenUnknown: 'Unknown',
  birthGenderLabel: 'Gender',
  birthGenderMale: 'Male',
  birthGenderFemale: 'Female',
  birthCityLabel: 'Birth city (optional)',
  birthCityPlaceholder: 'City',
  birthSave: 'Save',
  birthSaved: 'Saved',
  events: {
    wedding: 'Wedding',
    business: 'Open business',
    signing: 'Sign contract',
    move: 'Relocate',
    'move-in': 'Move in',
    travel: 'Travel',
    burial: 'Burial',
    groundbreaking: 'Break ground',
    medical: 'Medical',
    study: 'Start school',
  },
  officers: {
    建: 'Establish',
    除: 'Remove',
    满: 'Full',
    平: 'Balance',
    定: 'Stable',
    执: 'Initiate',
    破: 'Destruction',
    危: 'Danger',
    成: 'Success',
    收: 'Harvest',
    开: 'Open',
    闭: 'Close',
  },
  personal: {
    forYou: 'For you',
    fit: { 吉: 'Favorable', 平: 'Neutral', 凶: 'Caution' },
    summary: {
      吉: 'A favorable day — good for making the moves you have in mind.',
      平: 'A steady, even day — keep to your plan and proceed calmly.',
      凶: 'A day to hold back — stay low-key and avoid pushing your luck.',
    },
    why: 'See why',
    reason: {
      day_generates_self: "Today's element nourishes you — seize the moment",
      day_controls_self: "Today's element restrains you — hold steady",
      self_generates_day: 'Today drains your energy a little — pace yourself',
      self_controls_day: 'You can steer today — take the initiative',
      day_same_as_self: 'Today is in tune with you — steady support',
      favorable_element_present: "Today's element is your favorable one — extra supportive",
      unfavorable_element_present: "Today's element is unfavorable for you — pace yourself",
      personal_clash: 'Today clashes with your earthly branch — avoid big decisions',
    },
    setBirth: 'Set birth date',
    birthDatePlaceholder: 'YYYY-MM-DD',
    birthHint: 'Powers "For you" personalization',
  },
  people: {
    title: 'Birthdays',
    add: 'Add someone',
    name: 'Name',
    namePlaceholder: 'Mom / Alex',
    date: 'Birthday',
    yearOptional: 'Birth year (optional)',
    solar: 'Solar',
    lunar: 'Lunar',
    advance: 'Remind before',
    dayUnit: 'd',
    noAdvance: 'Off',
    remindOnDay: 'Also on the day',
    reminderHint: "We'll remind you before the day",
    submit: 'Add',
    empty: "No one yet. Add a birthday and we'll remind you.",
    delete: 'Delete',
    relation: 'Bond',
    self: 'You',
    needBirth: 'Your birth needed',
    needBirthBody: 'Set your own birth in Settings to see your bond with them.',
    homeEntry: 'Add birthday',
  },
  watchWidgets: 'Watch & Widgets',
}

const TABLE: Record<Locale, Strings> = { 'zh-Hans': zhHans, 'zh-Hant': zhHant, ja, en }

/** Resolve the device locale to one of our 4 supported locales. */
export function resolveLocale(): Locale {
  const first = getLocales()[0]
  const code = (first?.languageCode ?? 'en').toLowerCase()
  if (code === 'ja') return 'ja'
  if (code === 'zh') {
    const tag = `${first?.languageTag ?? ''}`.toLowerCase()
    const script = `${first?.languageScriptCode ?? ''}`.toLowerCase()
    const isTraditional =
      script.includes('hant') ||
      tag.includes('hant') ||
      tag.includes('tw') ||
      tag.includes('hk') ||
      tag.includes('mo')
    return isTraditional ? 'zh-Hant' : 'zh-Hans'
  }
  return 'en'
}

export function getStrings(locale: Locale): Strings {
  return TABLE[locale]
}
