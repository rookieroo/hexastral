/**
 * Auspice i18n — 4 locales out of the gate (ADR-0010 §3): zh-Hans / zh-Hant / ja / en.
 *
 * Scope note (v1): UI chrome + event taxonomy + 建除 glosses are fully translated.
 * The 黄历 domain vocabulary returned by the API (宿名 / 宜忌 verbs) renders as the
 * source CJK term — fine for zh/ja (shared kanji); a full en/ja 宜忌 glossary is a
 * content task tracked alongside C.2.5 / C.1.7.
 */

import { getLocales } from 'expo-localization'
import type { AuspiceEvent, DayOfficer, PersonalFit, PersonalReasonCode } from './api'

export type Locale = 'zh-Hans' | 'zh-Hant' | 'ja' | 'en'

/**
 * 六曜 (Rokuyo) strings — JP-only. Surfaced solely in the ja DayView, so this
 * block is optional on `Strings` and lives only on the `ja` table; other locales
 * leave it undefined and never render the section.
 */
export interface RokuyoStrings {
  /** Section label, "六曜". */
  label: string
  /** One-line framing as a calendar annotation (not a personal fortune). */
  caption: string
  /** Per-day meanings indexed by Rokuyo.index (0=大安 … 5=仏滅, (month+day)%6 order). */
  items: readonly [string, string, string, string, string, string]
}

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
  /** 六曜 — JP-only; undefined on non-ja locales (the section never renders). */
  rokuyo?: RokuyoStrings
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
  /** 节假日 / 调休 heads-up toggle label + hint. */
  holidayHeadsUp: string
  holidayHeadsUpHint: string
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
  /** Bulleted list of what Auspice Pro unlocks, shown in the paywall sheet. */
  proBenefits: string[]
  /** Plan label for the monthly subscription. */
  proMonthly: string
  /** Plan label for the annual subscription. */
  proAnnual: string
  /** Restore-purchases row label. */
  proRestore: string
  /** Login-at-subscribe gate (sign in before purchase). */
  signInToSubscribe: string
  signInBenefit: string
  signInWithGoogle: string
  signInError: string
  /** Indicator on /event when specialized scoring is active (Pro + a specialized event). */
  specializedActive: string
  /** Upsell pill on /event when user picks a specialized event but isn't Pro yet. */
  specializedUpsell: string
  /** Section label above the 择日 date-range control. */
  eventRangeSection: string
  /** Free-tier note: the search is pinned to the next 30 days, top 3. */
  eventRangeFreeNote: string
  /** Pro upsell on the date-range row — unlock a custom window. */
  eventRangeUpsell: string
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
  /** Instruction under the globe picker — drag to spin, tap to choose a point. */
  remoteTzGlobeHint: string
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
  /** Hint subtitle beneath the home culture drill-in — enumerates the 6 hub categories. */
  cultureHubBlurb: string
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
  /** Note under 流月: only this year is shown; key-moment reminders live in Settings. */
  timelineLiuyueNote: string
  /** Badge text on the currently-active row in any timeline section. */
  timelineCurrentBadge: string
  /** Age-range label fragment — pass {age} as a template token. */
  timelineAgeFrom: string
  /** Paywall CTA shown beneath the gated sections for Free users. */
  timelineProLocked: string
  /** 择吉 deep-link shown when a future 流年 is selected — routes to /event with
   *  prefilled year-window. `{year}` is the gregorian year. */
  timelineZejiCta: string
  /** Caption telling Free users they see the current position + next 6 months. */
  timelineFreePreviewNote: string
  /** Settings toggle label for the Pro 人生节点提醒 (month-start / 大运 push). */
  timelineRemindToggle: string
  /** Hint under the 人生节点提醒 toggle. */
  timelineRemindHint: string
  /** Short 对你而言 advice per fit verdict — shown on timeline rows + node reminders. */
  timelineAdvice: Record<PersonalFit, string>
  /** Period-specific element-favorability note ({el} = the period's 五行). Surfaces
   *  the 用神/忌神 signal that the generic per-grade advice omits. */
  timelinePeriodElement: { favorable: string; unfavorable: string }
  /** 十神 decade-theme — the life domain a 大运 activates (五类十神 → 领域). */
  timelineDomain: { 比劫: string; 食伤: string; 财星: string; 官杀: string; 印绶: string }
  /** 化解 ("支线解法") for a conflict / 忌神 node. {el} = the chart's 用神 五行. */
  timelineHuajie: string
  /** Make-if decision timing — what KIND of move the current 命局 window favors. */
  makeifTiming: {
    frame: string
    archetypes: { expand: string; hold: string; move: string; connect: string }
  }
  /** Make-if 命主干 backdrop — the real 大运 十神 a 假如 plays out against ({domain}
   *  = the 十神 life-domain word). The 命 vs 运 vs 选择 line. */
  makeifBackdrop: string
  /** Make-if cherry-pick — carry one good thing from an actionable 假如 into the
   *  real line. {el} = 用神 五行; {year} = nearest favorable 流年. */
  makeifCherrypick: string
  /** Make-if diff panel — labels for the 现实 vs 假如 side-by-side comparison. */
  makeifDiff: {
    /** Panel header (eyebrow caption). */
    header: string
    /** Column header for the real life line. */
    realCol: string
    /** Column header for the alt-life branch. */
    altCol: string
    /** Fork-age row label, {age} = the age the branch diverged. */
    forkRow: string
    /** Merge-age row label, {age} = the age the branch rejoined the real line. */
    mergeRow: string
    /** Suffix shown on the diff row when both columns share the same verdict. */
    sameSuffix: string
    /** Suffix shown when the verdicts diverge — the "real diff" moments. */
    diffSuffix: string
    /** Caption under the header: the rows are tappable + what the highlight /
     *  last column means (users couldn't tell either). */
    tapHint: string
  }
  /** Timeline 印证 — pin a past life event; the chart corroborates it (retrodiction). */
  yinzheng: {
    prompt: string
    lead: string
    matchFrame: string
    noMatch: string
    cats: {
      career: string
      relationship: string
      health: string
      travel: string
      education: string
      family: string
    }
    signals: {
      taohua: string
      yima: string
      favorable: string
      unfavorable: string
      clash: string
      /** 神煞 event-flavor chips (Phase 5). */
      guiren: string
      wenchang: string
      jiangxing: string
      jiesha: string
      /** 冲合刑害会 — period branch vs natal four pillars (Phase 5). */
      sanhe: string
      sanhui: string
      liuhe: string
      sanxing: string
      liuhai: string
      zixing: string
    }
  }
  /** Appended when a period 冲 the user's 本命支 (流年 = 冲太岁). */
  timelineClashNote: string
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
  /** Solar / Lunar toggle on the Birth-info form. Stored as solar; lunar is
   *  converted via @zhop/astro-core lunarToSolar before save. */
  birthCalendarSolar: string
  birthCalendarLunar: string
  /** Shown beneath the date input when the user has Lunar selected, so the
   *  visual context for "what calendar am I typing in" doesn't depend on the
   *  segmented toggle alone. Used by both /me birth-info and /people. */
  birthCalendarLunarHint: string
  birthShichenLabel: string
  birthShichenUnknown: string
  birthGenderLabel: string
  birthGenderMale: string
  birthGenderFemale: string
  birthCityLabel: string
  birthCityPlaceholder: string
  /** Why the city field matters — true-solar-time correction for 时柱/日柱
   *  accuracy. Shown beneath the city picker. */
  birthCityHint: string
  birthSave: string
  birthSaved: string
  events: Record<AuspiceEvent, string>
  officers: Record<DayOfficer, string>
  personal: {
    forYou: string
    fit: Record<PersonalFit, string>
    /** Free one-line fortune read per verdict — the natural takeaway. The per-reason "why" stays Pro. */
    summary: Record<PersonalFit, string>
    /** Quiet CTA that opens the Pro reading ("see why"). */
    why: string
    /** Pro-tier CTA on 对你而言 → opens the LLM deep reading of the day. */
    deepRead: string
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
    yearRequired: string
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
    /** Title on the prominent compatibility-mode card (sits above the row's Switch). */
    compatibilityToggle: string
    /** One-line hook shown next to the Switch — sells what flipping it ON unlocks
     *  (合盘 / 八字 detail) in a single glance, without burying it in fine print. */
    compatibilityHook: string
    /** Long-form hint that appears only AFTER the Switch is on, before the extra
     *  fields. Explains the two-person report + Kindred hand-off in detail. */
    compatibilityHint: string
    /** Shown inside the expanded 合盘 section when the solar birth year is missing —
     *  合盘 silently can't compute without it, so make the requirement explicit. */
    compatYearRequired: string
    /** Label above the deterministic 合盘 score taste shown before the Kindred hand-off. */
    synastryScore: string
  }
  watchWidgets: string
  /** Honest section blurb: what ships today (widget + 月相) vs the watch preview. */
  watchWidgetsNote: string
  /** Caption under the home-widget preview mockup. */
  widgetPreviewCaption: string
  /** Caption under the watch-face preview mockup (carries the coming-soon note). */
  watchPreviewCaption: string
  /** Picker label for the watch-face styles (a preview; watch app not shipped). */
  watchStyleLabel: string
  /** Picker label for the 月相 palette (applies to the shipping widget). */
  moonSkinLabel: string
  /** Small "coming soon" badge. */
  comingSoon: string
  themeAccent: string
  /** CTA below the 生肖 reading that opens Kindred for full 合盘. */
  kindredComposeCta: string
  /** Cross-app data-sharing consent shown before the Kindred 合盘 hand-off. */
  kindredShareConsent: { title: string; body: string; confirm: string; cancel: string }
  /** Shown when the contact's birthday is 农历 — Kindred only accepts solar. */
  kindredComposeLunarNote: string
  /** 关系桥 (Auspice×Kindred) — 今日你和TA + 合婚择吉日 (the calendar-shaped
   *  relationship action; the deep 合盘 report stays in Kindred). */
  pair: {
    todayHeading: string
    picksHeading: string
    resonance: string
    tension: string
    neutral: string
    resonanceLine: string
    tensionLine: string
    neutralLine: string
    loading: string
    picksEmpty: string
    shareCta: string
  }
  /** Section label above the Apple Calendar subscribe row. */
  appleCalendarSection: string
  /** Row label that opens the system Calendar subscribe sheet. */
  appleCalendarSubscribeRow: string
  /** Hint subtitle beneath the subscribe row. */
  appleCalendarSubscribeHint: string
  /** Pro 对你而言 calendar subscribe row + hint. */
  personalCalendarRow: string
  personalCalendarHint: string
}

const zhHans: Strings = {
  appName: 'Auspice 黄历',
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
  holidayHeadsUp: '节假日提醒',
  holidayHeadsUpHint: '法定节假日 / 调休前一晚提醒你，别记错闹钟（中国大陆）。',
  privacy: '隐私政策',
  terms: '使用条款',
  openMonth: '月历',
  discover: '探索矩阵',
  benming: '本命年',
  nextSolarTerm: '下一节气',
  lunarLabel: '农历',
  personalClashLabel: '今日冲你',
  unlockMore: '解锁更多',
  proTitle: 'Auspice Pro',
  proSubtitle: '对你而言逐条解读 · 完整人生时间线 · 择日自定义日期范围',
  proBenefits: [
    '对你而言 · 每条宜忌的逐条解读',
    '完整人生时间线 · 大运 / 流年 / 全年流月',
    '择日自定义日期范围 · 最长约 3 个月（免费版仅未来 30 天，专项择日免费）',
    '个人黄历日历 · 一键订阅到系统日历',
  ],
  proMonthly: '月度订阅',
  proAnnual: '年度订阅',
  proRestore: '恢复购买',
  signInToSubscribe: '订阅前请先登录',
  signInBenefit: '登录后，订阅可在所有设备恢复，并在你使用「Kindred」等其他应用时延续。',
  signInWithGoogle: '使用 Google 登录',
  signInError: '登录失败，请重试。',
  specializedActive: '专项择日 已启用',
  specializedUpsell: 'Pro · 解锁专项择日',
  eventRangeSection: '时间范围',
  eventRangeFreeNote: '未来 30 天 · 取最佳 3 天',
  eventRangeUpsell: 'Pro · 自定义日期范围',
  remoteTzSection: '外地时区',
  remoteTzOffsetHint: '时差 (例 +8 / -5)',
  remoteTzCityHint: '城市 (可选)',
  remoteTzSave: '保存',
  remoteTzClear: '清除',
  remoteTzNow: '已是',
  remoteTzGlobeHint: '拖动旋转，点选地点设定时区',
  openFestivals: '节庆',
  cultureHub: '文化',
  cultureSnippetTitle: '今日文化',
  cultureReadMore: '阅读全文',
  cultureUpcomingTerm: '即将到来 · {name}',
  cultureTopicsTitle: '文化百科',
  cultureHubBlurb: '节日 · 节气 · 时辰 · 干支 · 八字 · 紫微',
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
  timelineLiuyueNote: '只显示今年流月。重要时点的提醒可在「设置」开启推送。',
  timelineCurrentBadge: '当前',
  timelineAgeFrom: '{age} 岁起',
  timelineProLocked: '解锁完整人生时间线',
  timelineZejiCta: '→ {year}年的吉日窗口',
  timelineFreePreviewNote:
    '免费版显示当前大运、今年流年与未来 6 个月流月；解锁 Pro 查看完整人生时间线。',
  timelineRemindToggle: '人生节点提醒',
  timelineRemindHint: '每月初与大运转换时，提醒你查看本月流月与人生时间线。',
  timelineAdvice: {
    吉: '气运相生，宜主动进取、顺势把握时机。',
    平: '运势平稳，按部就班、稳中求进即可。',
    凶: '气运受克，宜守不宜攻；注意休息、少熬夜，别硬撑。',
  },
  timelinePeriodElement: {
    favorable: '{el}行正是你的用神，此运整体有助力。',
    unfavorable: '{el}行为你的忌神，此运宜稳健、多留意。',
  },
  timelineClashNote: '与本命相冲，诸事多留意、勿冲动。',
  timelineDomain: {
    比劫: '人际 · 竞合',
    食伤: '表达 · 创作',
    财星: '财富 · 务实',
    官杀: '事业 · 责任',
    印绶: '学养 · 贵人',
  },
  timelineHuajie: '化解：多借{el}行之力，宜静守、纳贵人。',
  makeifTiming: {
    frame: '当前命局时机',
    archetypes: {
      expand: '利于主动进取',
      hold: '宜守不宜攻',
      move: '利于远行换境',
      connect: '利于结缘合作',
    },
  },
  makeifBackdrop: '命主干 · {domain}运 —— 选择之外,命势自有牵引。',
  makeifCherrypick: '带回现实 · 借{el}行之力,{year}年顺势而为。',
  makeifDiff: {
    header: '对照 · 现实 vs 假如',
    realCol: '现实',
    altCol: '假如',
    forkRow: '分岔 · {age}岁',
    mergeRow: '复归 · {age}岁',
    sameSuffix: '同向',
    diffSuffix: '相左',
    tapHint: '点任一行展开那一年的解读 · 高亮行＝这个选择真正改变了运势',
  },
  yinzheng: {
    prompt: '这一年你经历了什么?',
    lead: '那一年正逢',
    matchFrame: '命盘印证了这一点。',
    noMatch: '这一年命盘相对平静 —— 变化更多来自你自己。',
    cats: {
      career: '事业',
      relationship: '感情',
      health: '健康',
      travel: '远行',
      education: '学业',
      family: '家庭',
    },
    signals: {
      taohua: '桃花当令',
      yima: '驿马动',
      favorable: '用神助力',
      unfavorable: '忌神当道',
      clash: '冲太岁',
      guiren: '贵人扶持',
      wenchang: '文昌利学',
      jiangxing: '将星掌权',
      jiesha: '劫煞破耗',
      sanhe: '三合贵聚',
      sanhui: '三会得令',
      liuhe: '六合贴身',
      sanxing: '三刑相磨',
      liuhai: '六害暗耗',
      zixing: '自刑自扰',
    },
  },
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
  birthCalendarSolar: '阳历',
  birthCalendarLunar: '农历',
  birthCalendarLunarHint: '输入农历月日（闰月不区分）',
  birthShichenLabel: '出生时辰',
  birthShichenUnknown: '未知',
  birthGenderLabel: '性别',
  birthGenderMale: '男',
  birthGenderFemale: '女',
  birthCityLabel: '出生地（可选）',
  birthCityPlaceholder: '城市',
  birthCityHint:
    '用于真太阳时校准 — 让时柱、日柱更准。远离标准经度的出生地（美洲、欧洲、中国西部）影响最高可达 2 小时；东部中国通常 ≤15 分钟。',
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
    deepRead: '深入解读',
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
    yearRequired: '出生年份（必填）',
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
    compatibilityToggle: '看你们怎么咬合',
    compatibilityHook: '打开后录入八字，解锁你们的关系合盘',
    compatibilityHint:
      '填写性别、时辰与出生地后，将解锁你们两人的关系合盘报告，可在 Kindred App 中查看。',
    compatYearRequired: '关系合盘需要完整的阳历出生年份 —— 请在上方「出生年份」填写并确认。',
    synastryScore: '你们的缘分指数',
  },
  watchWidgets: '桌面组件与表盘',
  watchWidgetsNote:
    '桌面组件显示当日黄历，可选月相皮肤，分小 / 中两种版式。表盘样式为手表版预览 —— 手表 App 即将推出。',
  widgetPreviewCaption: '桌面组件',
  watchPreviewCaption: '表盘 · 即将推出',
  watchStyleLabel: '表盘样式',
  moonSkinLabel: '月相',
  comingSoon: '即将推出',
  themeAccent: '主题色',
  kindredComposeCta: '在 Kindred 看完整合盘 →',
  kindredShareConsent: {
    title: '分享生辰给 Kindred?',
    body: '将把你和 TA 的出生信息发送到 Kindred,用于生成关系合盘。前几章免费阅读,完整报告在 Kindred 内解锁(下载并不会全部解锁)。仅在你同意后共享。',
    confirm: '同意并打开',
    cancel: '取消',
  },
  kindredComposeLunarNote: 'Kindred 暂仅支持阳历生日。可在编辑亲友时换成阳历再试。',
  pair: {
    todayHeading: '今日 · 你和TA',
    picksHeading: '为你俩择吉日',
    resonance: '同气',
    tension: '相激',
    neutral: '平和',
    resonanceLine: '今日两人气场相合，宜共事、相约、定大事。',
    tensionLine: '今日两人气场相激，各退一步，宜缓不宜急。',
    neutralLine: '今日两人气场平和，顺其自然即可。',
    loading: '测算中…',
    picksEmpty: '近期暂无格外契合的好日子，过段时间再看看。',
    shareCta: '分享好日子',
  },
  appleCalendarSection: '系统日历',
  personalCalendarRow: '对你而言 · 专属日历',
  personalCalendarHint: '把每天的吉 / 平 / 凶同步到系统日历（Pro）',
  appleCalendarSubscribeRow: '在 Apple 日历订阅黄历',
  appleCalendarSubscribeHint:
    '把每日干支、节气、宜忌同步到 iPhone / Mac 日历，不用打开 App 也能看见。',
}

const zhHant: Strings = {
  ...zhHans,
  appName: 'Auspice 黃曆',
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
  holidayHeadsUp: '節假日提醒',
  holidayHeadsUpHint: '法定節假日 / 調休前一晚提醒你，別記錯鬧鐘（中國大陸）。',
  privacy: '隱私政策',
  terms: '使用條款',
  openMonth: '月曆',
  discover: '探索矩陣',
  benming: '本命年',
  nextSolarTerm: '下一節氣',
  lunarLabel: '農曆',
  personalClashLabel: '今日沖你',
  unlockMore: '解鎖更多',
  proTitle: 'Auspice Pro',
  proSubtitle: '對你而言逐條解讀 · 完整人生時間線 · 擇日自訂日期範圍',
  proBenefits: [
    '對你而言 · 每條宜忌的逐條解讀',
    '完整人生時間線 · 大運 / 流年 / 全年流月',
    '擇日自訂日期範圍 · 最長約 3 個月（免費版僅未來 30 天，專項擇日免費）',
    '個人黃曆日曆 · 一鍵訂閱到系統日曆',
  ],
  proMonthly: '月度訂閱',
  proAnnual: '年度訂閱',
  proRestore: '恢復購買',
  signInToSubscribe: '訂閱前請先登入',
  signInBenefit: '登入後，訂閱可在所有裝置恢復，並在你使用「Kindred」等其他應用時延續。',
  signInWithGoogle: '使用 Google 登入',
  signInError: '登入失敗，請重試。',
  specializedActive: '專項擇日 已啟用',
  specializedUpsell: 'Pro · 解鎖專項擇日',
  eventRangeSection: '時間範圍',
  eventRangeFreeNote: '未來 30 天 · 取最佳 3 天',
  eventRangeUpsell: 'Pro · 自訂日期範圍',
  remoteTzSection: '外地時區',
  remoteTzOffsetHint: '時差 (例 +8 / -5)',
  remoteTzCityHint: '城市 (可選)',
  remoteTzSave: '保存',
  remoteTzClear: '清除',
  remoteTzNow: '已是',
  remoteTzGlobeHint: '拖曳旋轉，點選地點設定時區',
  openFestivals: '節慶',
  cultureHub: '文化',
  cultureSnippetTitle: '今日文化',
  cultureReadMore: '閱讀全文',
  cultureUpcomingTerm: '即將到來 · {name}',
  cultureTopicsTitle: '文化百科',
  cultureHubBlurb: '節日 · 節氣 · 時辰 · 干支 · 八字 · 紫微',
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
  timelineLiuyueNote: '只顯示今年流月。重要時點的提醒可在「設定」開啟推播。',
  timelineCurrentBadge: '當前',
  timelineAgeFrom: '{age} 歲起',
  timelineProLocked: '解鎖完整人生時間線',
  timelineZejiCta: '→ {year}年的吉日窗口',
  timelineFreePreviewNote:
    '免費版顯示當前大運、今年流年與未來 6 個月流月；解鎖 Pro 查看完整人生時間線。',
  timelineRemindToggle: '人生節點提醒',
  timelineRemindHint: '每月初與大運轉換時，提醒你查看當月流月與人生時間線。',
  timelineAdvice: {
    吉: '氣運相生，宜主動進取、順勢把握時機。',
    平: '運勢平穩，按部就班、穩中求進即可。',
    凶: '氣運受剋，宜守不宜攻；注意休息、少熬夜，別硬撐。',
  },
  timelinePeriodElement: {
    favorable: '{el}行正是你的用神，此運整體有助力。',
    unfavorable: '{el}行為你的忌神，此運宜穩健、多留意。',
  },
  timelineClashNote: '與本命相沖，諸事多留意、勿衝動。',
  timelineDomain: {
    比劫: '人際 · 競合',
    食伤: '表達 · 創作',
    财星: '財富 · 務實',
    官杀: '事業 · 責任',
    印绶: '學養 · 貴人',
  },
  timelineHuajie: '化解：多借{el}行之力，宜靜守、納貴人。',
  makeifTiming: {
    frame: '當前命局時機',
    archetypes: {
      expand: '利於主動進取',
      hold: '宜守不宜攻',
      move: '利於遠行換境',
      connect: '利於結緣合作',
    },
  },
  makeifBackdrop: '命主幹 · {domain}運 —— 選擇之外,命勢自有牽引。',
  makeifCherrypick: '帶回現實 · 借{el}行之力,{year}年順勢而為。',
  makeifDiff: {
    header: '對照 · 現實 vs 假如',
    realCol: '現實',
    altCol: '假如',
    forkRow: '分岔 · {age}歲',
    mergeRow: '復歸 · {age}歲',
    sameSuffix: '同向',
    diffSuffix: '相左',
    tapHint: '點任一行展開那一年的解讀 · 高亮行＝這個選擇真正改變了運勢',
  },
  yinzheng: {
    prompt: '這一年你經歷了什麼?',
    lead: '那一年正逢',
    matchFrame: '命盤印證了這一點。',
    noMatch: '這一年命盤相對平靜 —— 變化更多來自你自己。',
    cats: {
      career: '事業',
      relationship: '感情',
      health: '健康',
      travel: '遠行',
      education: '學業',
      family: '家庭',
    },
    signals: {
      taohua: '桃花當令',
      yima: '驛馬動',
      favorable: '用神助力',
      unfavorable: '忌神當道',
      clash: '沖太歲',
      guiren: '貴人扶持',
      wenchang: '文昌利學',
      jiangxing: '將星掌權',
      jiesha: '劫煞破耗',
      sanhe: '三合貴聚',
      sanhui: '三會得令',
      liuhe: '六合貼身',
      sanxing: '三刑相磨',
      liuhai: '六害暗耗',
      zixing: '自刑自擾',
    },
  },
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
  birthCalendarSolar: '陽曆',
  birthCalendarLunar: '農曆',
  birthCalendarLunarHint: '輸入農曆月日（閏月不區分）',
  birthShichenLabel: '出生時辰',
  birthShichenUnknown: '未知',
  birthGenderLabel: '性別',
  birthGenderMale: '男',
  birthGenderFemale: '女',
  birthCityLabel: '出生地（可選）',
  birthCityPlaceholder: '城市',
  birthCityHint:
    '用於真太陽時校準 — 讓時柱、日柱更準。遠離標準經度的出生地（美洲、歐洲、中國西部）影響最高可達 2 小時；東部中國通常 ≤15 分鐘。',
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
    deepRead: '深入解讀',
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
    yearRequired: '出生年份（必填）',
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
    compatibilityToggle: '看你們怎麼咬合',
    compatibilityHook: '打開後錄入八字，解鎖你們的關係合盤',
    compatibilityHint:
      '填寫性別、時辰與出生地後，將解鎖你們兩人的關係合盤報告，可在 Kindred App 中查看。',
    compatYearRequired: '關係合盤需要完整的陽曆出生年份 —— 請在上方「出生年份」填寫並確認。',
    synastryScore: '你們的緣分指數',
  },
  watchWidgets: '桌面元件與錶盤',
  watchWidgetsNote:
    '桌面元件顯示當日黃曆，可選月相皮膚，分小 / 中兩種版式。錶盤樣式為手錶版預覽 —— 手錶 App 即將推出。',
  widgetPreviewCaption: '桌面元件',
  watchPreviewCaption: '錶盤 · 即將推出',
  watchStyleLabel: '錶盤樣式',
  moonSkinLabel: '月相',
  comingSoon: '即將推出',
  themeAccent: '主題色',
  kindredComposeCta: '在 Kindred 看完整合盤 →',
  kindredShareConsent: {
    title: '分享生辰給 Kindred?',
    body: '將把你和 TA 的出生資訊傳送到 Kindred,用於產生關係合盤。前幾章免費閱讀,完整報告在 Kindred 內解鎖(下載並不會全部解鎖)。僅在你同意後共享。',
    confirm: '同意並開啟',
    cancel: '取消',
  },
  kindredComposeLunarNote: 'Kindred 暫僅支援陽曆生日。可在編輯親友時換成陽曆再試。',
  pair: {
    todayHeading: '今日 · 你和TA',
    picksHeading: '為你倆擇吉日',
    resonance: '同氣',
    tension: '相激',
    neutral: '平和',
    resonanceLine: '今日兩人氣場相合，宜共事、相約、定大事。',
    tensionLine: '今日兩人氣場相激，各退一步，宜緩不宜急。',
    neutralLine: '今日兩人氣場平和，順其自然即可。',
    loading: '測算中…',
    picksEmpty: '近期暫無格外契合的好日子，過段時間再看看。',
    shareCta: '分享好日子',
  },
  appleCalendarSection: '系統日曆',
  personalCalendarRow: '對你而言 · 專屬日曆',
  personalCalendarHint: '把每天的吉 / 平 / 凶同步到系統日曆（Pro）',
  appleCalendarSubscribeRow: '在 Apple 日曆訂閱黃曆',
  appleCalendarSubscribeHint:
    '把每日干支、節氣、宜忌同步到 iPhone / Mac 日曆，不用打開 App 也能看見。',
}

const ja: Strings = {
  appName: 'Auspice 暦',
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
  rokuyo: {
    label: '六曜',
    caption: '旧暦から導く日本の暦注。日の吉凶の目安として親しまれています。',
    items: [
      '大安 — 万事に吉。婚礼・開店・旅行など、何事を始めるにも良い日。',
      '赤口 — 正午前後のみ吉、ほかは凶。祝い事は控えめに。',
      '先勝 — 午前は吉、午後は凶。急ぐ用事は早めに済ませると良い。',
      '友引 — 朝夕は吉、正午は凶。祝い事に良いが葬儀は避ける習わし。',
      '先負 — 午前は凶、午後は吉。急がず、平静に過ごすと良い。',
      '仏滅 — 万事に凶とされる日。祝い事は避けるのが無難。',
    ],
  },
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
  holidayHeadsUp: '祝日リマインド',
  holidayHeadsUpHint: '法定祝日 / 振替出勤の前夜に通知（中国本土）。',
  privacy: 'プライバシー',
  terms: '利用規約',
  openMonth: 'カレンダー',
  discover: 'ほかのアプリ',
  benming: '本命年',
  nextSolarTerm: '次の節気',
  lunarLabel: '旧暦',
  personalClashLabel: '本日と冲',
  unlockMore: 'もっと見る',
  proTitle: 'Auspice Pro',
  proSubtitle: 'あなたへの個別解説 · 人生タイムライン全期間 · 日選びの期間指定',
  proBenefits: [
    'あなたへの個別解説 · 宜忌を一項目ずつ',
    '人生タイムライン全期間 · 大運 / 流年 / 通年の流月',
    '日選びの期間を自由に指定 · 最長約 3 か月（無料は今後 30 日、専門日選びは無料）',
    '個人の暦カレンダー · システムカレンダーに購読',
  ],
  proMonthly: '月額プラン',
  proAnnual: '年額プラン',
  proRestore: '購入を復元',
  signInToSubscribe: 'ご登録の前にサインイン',
  signInBenefit:
    'サインインすると購読は全デバイスで復元でき、「縁」など他のアプリにも引き継げます。',
  signInWithGoogle: 'Google でサインイン',
  signInError: 'サインインに失敗しました。もう一度お試しください。',
  specializedActive: '専門日選び 適用中',
  specializedUpsell: 'Pro · 専門日選びを解錠',
  eventRangeSection: '期間',
  eventRangeFreeNote: '今後 30 日 · ベスト 3 日',
  eventRangeUpsell: 'Pro · 期間を自由に指定',
  remoteTzSection: '現地時間',
  remoteTzOffsetHint: '時差 (例 +8 / -5)',
  remoteTzCityHint: '都市名（任意）',
  remoteTzSave: '保存',
  remoteTzClear: 'クリア',
  remoteTzNow: 'は',
  remoteTzGlobeHint: 'ドラッグで回転、地点をタップして時差を設定',
  openFestivals: '節句',
  cultureHub: '文化',
  cultureSnippetTitle: '今日の文化',
  cultureReadMore: '全文を読む',
  cultureUpcomingTerm: 'まもなく · {name}',
  cultureTopicsTitle: '文化百科',
  cultureHubBlurb: '節日 · 二十四節気 · 十二時辰 · 干支 · 八字 · 紫微',
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
  timelineLiuyueNote: '表示は今年の流月のみ。重要な時点の通知は「設定」で有効化できます。',
  timelineCurrentBadge: '現在',
  timelineAgeFrom: '{age} 歳から',
  timelineProLocked: '人生タイムラインを全期間解錠',
  timelineZejiCta: '→ {year}年の吉日候補',
  timelineFreePreviewNote:
    '無料版では現在の大運・今年の流年・今後 6 か月の流月を表示。Pro で全期間を解錠。',
  timelineRemindToggle: '人生の節目リマインド',
  timelineRemindHint: '毎月初めと大運の変わり目に、今月の流月と人生タイムラインをお知らせ。',
  timelineAdvice: {
    吉: '運気が味方します。積極的に動き、好機を掴みましょう。',
    平: '運気は穏やか。着実に、無理なく進めましょう。',
    凶: '運気は抑えぎみ。守りを固め、休息を大切に、無理は禁物。',
  },
  timelinePeriodElement: {
    favorable: '{el}はあなたの用神、この運は全体に追い風。',
    unfavorable: '{el}は忌神、この運は慎重に進めましょう。',
  },
  timelineClashNote: '本命と相冲。慌てず慎重に進めましょう。',
  timelineDomain: {
    比劫: '人間関係 · 競合',
    食伤: '表現 · 創作',
    财星: '財運 · 実務',
    官杀: '仕事 · 責任',
    印绶: '学び · 貴人',
  },
  timelineHuajie: '化解：{el}の力を借り、静を守り貴人を頼みましょう。',
  makeifTiming: {
    frame: '今の命局のタイミング',
    archetypes: {
      expand: '攻めが活きる',
      hold: '守りが吉',
      move: '移動・遠出に向く',
      connect: 'ご縁・協働に向く',
    },
  },
  makeifBackdrop: '命の主軸 · {domain}運 —— 選択を超えて、命勢が静かに導きます。',
  makeifCherrypick: '現実へ持ち帰る · {el}の力を借り、{year}年に動きましょう。',
  makeifDiff: {
    header: '対比 · 現実 vs もしも',
    realCol: '現実',
    altCol: 'もしも',
    forkRow: '分岐 · {age}歳',
    mergeRow: '合流 · {age}歳',
    sameSuffix: '同調',
    diffSuffix: '相違',
    tapHint: '行をタップでその年の解説 · ハイライト＝選択が運勢を変えた節目',
  },
  yinzheng: {
    prompt: 'この年、何がありましたか?',
    lead: 'その年はちょうど',
    matchFrame: '命盤がそれを裏づけています。',
    noMatch: 'この年の命盤は比較的穏やか —— 変化はあなた自身から。',
    cats: {
      career: '仕事',
      relationship: '恋愛',
      health: '健康',
      travel: '遠出',
      education: '学び',
      family: '家族',
    },
    signals: {
      taohua: '桃花が旺',
      yima: '駅馬が動く',
      favorable: '用神の後押し',
      unfavorable: '忌神が強い',
      clash: '冲太歳',
      guiren: '貴人の助け',
      wenchang: '文昌・学業',
      jiangxing: '将星・統率',
      jiesha: '劫煞・散財',
      sanhe: '三合・貴の集い',
      sanhui: '三会・方の旺',
      liuhe: '六合・寄り添う',
      sanxing: '三刑・摩擦',
      liuhai: '六害・陰の消耗',
      zixing: '自刑・自縛',
    },
  },
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
  birthCalendarSolar: '新暦',
  birthCalendarLunar: '旧暦',
  birthCalendarLunarHint: '旧暦の月日を入力（閏月は区別なし）',
  birthShichenLabel: '生まれた時辰',
  birthShichenUnknown: '不明',
  birthGenderLabel: '性別',
  birthGenderMale: '男性',
  birthGenderFemale: '女性',
  birthCityLabel: '出生地（任意）',
  birthCityPlaceholder: '都市名',
  birthCityHint:
    '真太陽時補正に使用 — 時柱・日柱の精度を上げます。標準経度から離れた出生地（米国・欧州・中国西部）では最大 2 時間ずれることがあります。日本国内は通常 30 分以内。',
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
    deepRead: '詳しく読む',
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
    yearRequired: '生年（必須）',
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
    compatibilityToggle: '二人の噛み合い',
    compatibilityHook: 'オンにして八字を入力すれば、二人の相性が見えます',
    compatibilityHint:
      '性別・時辰・出生地を入力すると、ふたりの相性レポートが解放されます（Kindred アプリで閲覧）。',
    compatYearRequired:
      '相性鑑定には西暦の出生年が必要です —— 上の「生まれ年」にご記入・ご確認ください。',
    synastryScore: '二人の相性スコア',
  },
  watchWidgets: 'ウィジェットと文字盤',
  watchWidgetsNote:
    'ウィジェットは今日の暦を表示し、月相スキンを選べます（小 / 中の2サイズ）。文字盤スタイルは Watch 版のプレビュー —— Watch アプリは近日公開。',
  widgetPreviewCaption: 'ウィジェット',
  watchPreviewCaption: '文字盤 · 近日公開',
  watchStyleLabel: '文字盤スタイル',
  moonSkinLabel: '月相',
  comingSoon: '近日公開',
  themeAccent: 'テーマカラー',
  kindredComposeCta: 'Kindred で本格相性鑑定 →',
  kindredShareConsent: {
    title: 'Kindred に生年月日を共有しますか?',
    body: 'あなたと相手の出生情報を Kindred に送り、相性鑑定を作成します。最初の数章は無料、完全版は Kindred 内でアンロックします(ダウンロードだけで全章解放ではありません)。同意した場合のみ共有します。',
    confirm: '同意して開く',
    cancel: 'キャンセル',
  },
  kindredComposeLunarNote: 'Kindred は新暦の誕生日のみ対応。編集画面で新暦に切り替えてください。',
  pair: {
    todayHeading: '今日 · あなたと相手',
    picksHeading: '二人の吉日を選ぶ',
    resonance: '好相性',
    tension: '要注意',
    neutral: '平穏',
    resonanceLine: '今日は二人の気が和合。共同作業や約束、大事の決断に好適。',
    tensionLine: '今日は気がぶつかりやすい日。一歩譲り、急がず穏やかに。',
    neutralLine: '今日は穏やかな相性。自然体で問題なし。',
    loading: '計算中…',
    picksEmpty: '近いうちに特に好相性の日は見当たりません。',
    shareCta: '吉日をシェア',
  },
  appleCalendarSection: 'システムカレンダー',
  personalCalendarRow: 'あなたへ · 専用カレンダー',
  personalCalendarHint: '毎日の吉凶をシステムカレンダーに同期（Pro）',
  appleCalendarSubscribeRow: 'Apple カレンダーに暦を購読',
  appleCalendarSubscribeHint:
    '毎日の干支・節気・宜忌を iPhone / Mac のカレンダーへ同期。アプリを開かなくても確認できます。',
}

const en: Strings = {
  appName: 'Auspice',
  todayTab: 'Today',
  monthTab: 'Month',
  festivalsTab: 'Festivals',
  meTab: 'Me',
  today: 'Today',
  suitable: 'Good',
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
  holidayHeadsUp: 'Holiday heads-up',
  holidayHeadsUpHint: 'Night-before alert for public holidays / makeup workdays (mainland China).',
  privacy: 'Privacy',
  terms: 'Terms',
  openMonth: 'Calendar',
  discover: 'Discover',
  benming: 'Benming yr',
  nextSolarTerm: 'Next term',
  lunarLabel: 'Lunar',
  personalClashLabel: 'Clashes today',
  unlockMore: 'Unlock more',
  proTitle: 'Auspice Pro',
  proSubtitle: 'Per-reason For-you reading · Full life timeline · Custom date-picker range',
  proBenefits: [
    'For-you reading — every Suitable / Avoid explained, reason by reason',
    'Full life timeline — decade cycles, yearly, and all 12 months',
    'Custom date-picker range — up to ~3 months (Free is the next 30 days; specialized scoring is free)',
    'Personal almanac calendar — subscribe to your system Calendar',
  ],
  proMonthly: 'Monthly',
  proAnnual: 'Annual',
  proRestore: 'Restore purchase',
  signInToSubscribe: 'Sign in to subscribe',
  signInBenefit:
    'Signing in lets your subscription restore on every device and carry into other apps like Kindred.',
  signInWithGoogle: 'Sign in with Google',
  signInError: 'Sign-in failed. Please try again.',
  specializedActive: 'Specialized scoring on',
  specializedUpsell: 'Pro · unlock specialized scoring',
  eventRangeSection: 'Date range',
  eventRangeFreeNote: 'Next 30 days · top 3',
  eventRangeUpsell: 'Pro · custom date range',
  remoteTzSection: 'Remote timezone',
  remoteTzOffsetHint: 'Hours offset (e.g. +8 / -5)',
  remoteTzCityHint: 'City (optional)',
  remoteTzSave: 'Save',
  remoteTzClear: 'Clear',
  remoteTzNow: 'is now',
  remoteTzGlobeHint: 'Drag to spin, tap a spot to set the timezone',
  openFestivals: 'Festivals',
  cultureHub: 'Culture',
  cultureSnippetTitle: "Today's culture",
  cultureReadMore: 'Read more',
  cultureUpcomingTerm: 'Up next · {name}',
  cultureTopicsTitle: 'Culture guide',
  cultureHubBlurb: 'Festivals · solar terms · 12 hours · ganzhi · bazi · ziwei',
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
  timelineLiuyueNote:
    "Only this year's months are shown. Enable reminders for key moments in Settings.",
  timelineCurrentBadge: 'Now',
  timelineAgeFrom: 'From age {age}',
  timelineProLocked: 'Unlock the full life timeline',
  timelineZejiCta: '→ Best dates in {year}',
  timelineFreePreviewNote:
    'Free shows your current decade, this year, and the next 6 months. Unlock Pro for the full life timeline.',
  timelineRemindToggle: 'Timeline reminders',
  timelineRemindHint: 'A nudge at each month start and 大运 shift to check your timeline.',
  timelineAdvice: {
    吉: 'The energy supports you — take initiative and seize the moment.',
    平: 'Steady energy — keep a measured pace and build gradually.',
    凶: 'The energy runs counter — hold steady, rest well, and avoid overexerting.',
  },
  timelinePeriodElement: {
    favorable: '{el} is your favorable element — this period lends support.',
    unfavorable: '{el} is your unfavorable element — stay steady and watchful.',
  },
  timelineClashNote: 'This period clashes with your birth sign — proceed with extra care.',
  timelineDomain: {
    比劫: 'People · rivalry',
    食伤: 'Expression · output',
    财星: 'Wealth · the practical',
    官杀: 'Career · duty',
    印绶: 'Learning · mentors',
  },
  timelineHuajie: 'Remedy: lean on {el} — hold steady and seek allies.',
  makeifTiming: {
    frame: 'Your timing right now',
    archetypes: {
      expand: 'favors bold, outward moves',
      hold: 'favors holding steady',
      move: 'favors a change of place',
      connect: 'favors connection & partnership',
    },
  },
  makeifBackdrop:
    'Your real line · a {domain} chapter — beyond the choice, your chart still pulls.',
  makeifCherrypick: 'Carry it back · lean on {el}, act around {year}.',
  makeifDiff: {
    header: 'Side-by-side · Real vs What-if',
    realCol: 'Real',
    altCol: 'What-if',
    forkRow: 'Fork · age {age}',
    mergeRow: 'Merge · age {age}',
    sameSuffix: 'aligned',
    diffSuffix: 'diverges',
    tapHint: 'Tap a row to read that year · highlighted = where the choice changed your luck',
  },
  yinzheng: {
    prompt: 'What happened that year?',
    lead: 'That year carried ',
    matchFrame: 'your chart bears it out.',
    noMatch: 'That year read quietly on the chart — the change came more from you.',
    cats: {
      career: 'Career',
      relationship: 'Love',
      health: 'Health',
      travel: 'Travel',
      education: 'Study',
      family: 'Family',
    },
    signals: {
      taohua: 'a romance window',
      yima: 'a movement window',
      favorable: 'your favorable element',
      unfavorable: 'your unfavorable element',
      clash: 'a clash with your sign',
      guiren: 'a benefactor year',
      wenchang: 'a study window',
      jiangxing: 'a leadership year',
      jiesha: 'a year of loss',
      sanhe: 'a triple-harmony year',
      sanhui: 'a directional gathering',
      liuhe: 'a harmony pairing',
      sanxing: 'a friction year',
      liuhai: 'a quiet drain',
      zixing: 'a self-friction year',
    },
  },
  timelineBannerHint: 'Decade · Year',
  ganzhiStemsTitle: 'Ten Stems',
  ganzhiBranchesTitle: 'Twelve Branches',
  ganzhiSixtyTitle: 'Sixty Auspice',
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
  birthCalendarSolar: 'Solar',
  birthCalendarLunar: 'Chinese (lunar)',
  birthCalendarLunarHint: 'Enter the lunar month and day (leap months not distinguished).',
  birthShichenLabel: 'Birth hour',
  birthShichenUnknown: 'Unknown',
  birthGenderLabel: 'Gender',
  birthGenderMale: 'Male',
  birthGenderFemale: 'Female',
  birthCityLabel: 'Birth city (optional)',
  birthCityPlaceholder: 'City',
  birthCityHint:
    'Used for true-solar-time correction — sharpens the hour and day pillars. Births far from the standard meridian (US, Europe, Western China) can shift by up to 2 hours; Eastern China is usually ≤15 minutes.',
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
    deepRead: 'Go deeper',
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
    yearRequired: 'Birth year (required)',
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
    compatibilityToggle: 'See how you two mesh',
    compatibilityHook: 'Switch on + add their 八字 to unlock your compatibility report',
    compatibilityHint:
      'Add gender, birth hour and birthplace to unlock a relationship report for the two of you — viewable in the Kindred app.',
    compatYearRequired:
      'Compatibility needs the full solar birth year — fill in and confirm “Birth year” above.',
    synastryScore: 'Your compatibility',
  },
  watchWidgets: 'Widgets & Watch',
  watchWidgetsNote:
    "The widget shows today's almanac with your chosen moon skin, in small and medium sizes. The watch styles are a preview — the watch app is coming soon.",
  widgetPreviewCaption: 'Widget',
  watchPreviewCaption: 'Watch · soon',
  watchStyleLabel: 'Watch styles',
  moonSkinLabel: 'Moon skin',
  comingSoon: 'Soon',
  themeAccent: 'Accent color',
  kindredComposeCta: 'Open full reading in Kindred →',
  kindredShareConsent: {
    title: 'Share birth details with Kindred?',
    body: 'We will send both birth details to Kindred to generate your compatibility reading. The first chapters are free; the full report unlocks inside Kindred (downloading does not unlock everything). Shared only with your consent.',
    confirm: 'Agree & open',
    cancel: 'Cancel',
  },
  kindredComposeLunarNote:
    'Kindred supports solar birthdays only. Edit this person to a solar date and try again.',
  pair: {
    todayHeading: 'Today · You & them',
    picksHeading: 'Good days for the two of you',
    resonance: 'In sync',
    tension: 'Friction',
    neutral: 'Steady',
    resonanceLine: 'Your energies align today — good for joint plans, meeting up, big decisions.',
    tensionLine: 'Energies grate today — give a little, keep things low-key.',
    neutralLine: 'A calm pairing today — go with the flow.',
    loading: 'Calculating…',
    picksEmpty: 'No standout days for the two of you right now — check back later.',
    shareCta: 'Share these days',
  },
  appleCalendarSection: 'System calendar',
  personalCalendarRow: 'For-you calendar',
  personalCalendarHint: 'Sync your daily verdict to the system Calendar (Pro)',
  appleCalendarSubscribeRow: 'Subscribe in Apple Calendar',
  appleCalendarSubscribeHint:
    'Sync daily 干支, solar terms, and yi/ji to your iPhone / Mac Calendar so you see them without opening the app.',
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
