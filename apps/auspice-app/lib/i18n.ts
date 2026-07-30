/**
 * Auspice i18n — 4 locales out of the gate (ADR-0010 §3): zh-Hans / zh-Hant / ja / en.
 *
 * Scope note (v1): UI chrome + event taxonomy + 建除 glosses are fully translated.
 * The 黄历 domain vocabulary returned by the API (宿名 / 宜忌 verbs) renders as the
 * source CJK term — fine for zh/ja (shared kanji); a full en/ja 宜忌 glossary is a
 * content task tracked alongside C.2.5 / C.1.7.
 */

import type { LunarPhaseName } from '@zhop/hexastral-tokens/lunar'
import { getLocales } from 'expo-localization'
import type { AuspiceEvent, DayOfficer, PersonalFit, PersonalReasonCode } from './api'

export type Locale = 'zh-Hans' | 'zh-Hant' | 'ja' | 'en'

/** 五行 char — keys the 用神 → 吉色/吉方 localized name maps on the 对你而言 card. */
export type WuXingChar = '木' | '火' | '土' | '金' | '水'

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
  eveningPush: string
  eveningPushHint: string
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
  /** Short legal disclaimer for paywall, deep-read, and AI surfaces. */
  legalDisclaimerShort: string
  /** Login-at-subscribe gate (sign in before purchase). */
  signInToSubscribe: string
  signInBenefit: string
  signInWithGoogle: string
  signInError: string
  /** Login before saving birth (account sync). */
  signInForBirthTitle: string
  signInForBirthBenefit: string
  /** Multi-device birth sync toggle. */
  birthMultiDeviceSync: string
  birthMultiDeviceSyncHint: string
  birthSyncGatedMultiDevice: string
  birthSyncEnableMultiDevice: string
  birthConflictTitle: string
  birthConflictBody: string
  birthConflictUseAccount: string
  birthConflictUseLocal: string
  birthSaveFailed: string
  birthSaving: string
  /** Account deletion (Apple 5.1.1(v)). */
  deleteAccount: string
  deleteAccountConfirmTitle: string
  deleteAccountConfirmBody: string
  deleteAccountCancel: string
  deleteAccountConfirmCta: string
  deleteAccountFailed: string
  deleteAccountWorking: string
  accountSection: string
  signedInLabel: string
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
  /** Animated swipe-left hint at the bottom of Today — opens Calendar. */
  swipeCalendarHint: string
  /** Animated swipe-right hint at the bottom of Today — opens Settings. */
  swipeMeHint: string
  /** Today DayView zone label — classical almanac (宜忌). */
  almanacSection: string
  /** Today DayView zone label — collapsed culture explore. */
  exploreSection: string
  /** Expand/collapse the explore zone on Today. */
  exploreExpand: string
  exploreCollapse: string
  /** Calendar secondary page CTA — open selected day on Today home. */
  openInToday: string
  /** Settings section — library / explore drill-ins. */
  settingsLibrary: string
  /** Settings section — push notification toggles. */
  settingsNotifications: string
  /** Settings section — calendar feeds + remote timezone. */
  settingsCalendars: string
  /** Settings section — privacy, terms, disclaimer. */
  settingsLegal: string
  /** Library row — life timeline (大运流年). */
  libraryTimeline: string
  /** Library row — what-if reflection. */
  libraryMakeIf: string
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
  /** Free upsell under a current/future 流年 reading — advertises the Pro 流月
   *  (monthly) weave that free users don't see, and notes its scope. */
  timelineLiuyueUpsell: string
  /** Contextual drill-in under the node reading → the 八字 explainer (大运/流年). */
  timelineAboutLuck: string
  /** 择吉 deep-link shown when a future 流年 is selected — routes to /event with
   *  prefilled year-window. `{year}` is the gregorian year. */
  timelineZejiCta: string
  /** Caption telling Free users they see the current position + next 6 months. */
  timelineFreePreviewNote: string
  /** Settings toggle label for the Pro 人生节点提醒 (month-start / 大运 push). */
  timelineRemindToggle: string
  /** Hint under the 人生节点提醒 toggle. */
  timelineRemindHint: string
  /** Alert when enabling timeline reminders without a saved birth + gender. */
  timelineRemindNeedBirth: string
  /** Alert when notification permission is denied for timeline reminders. */
  timelineRemindNeedPush: string
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
  /** 合盘 (synastry) relationship timeline screen. */
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
    /** Last-col verdict compare (生克): alt 生扶 real (↑ favored). */
    help: string
    /** Last-col: alt 比和 real (no change). */
    even: string
    /** Last-col: alt 克泄 real (↓ strained) — these rows offer a 解法. */
    harm: string
    /** Label for the remedy a 受克(harm) row offers. */
    remedy: string
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
  /** Birth-less invitation card on Today — title + one-line value prop that
   *  surfaces the timeline/what-if promise before any birth is entered. */
  timelineInviteTitle: string
  timelineInviteBody: string
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
  /** Leap-month toggle when Lunar calendar is selected (/people + birth form). */
  birthCalendarLeap: string
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
  /** Disclosure label when the (optional) birth-place field is collapsed. */
  birthCityToggle: string
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
    /** Drill-in to the full personal 合参命书 (八字 + 紫微 deep read). */
    readingTitle: string
    readingHint: string
    /** 用神 → 吉色/吉方/吉时 — the actionable personal daily increment shown on the
     *  对你而言 card. App-only (never in the export/push, to protect DAU + sub value). */
    lucky: {
      /** Section labels. */
      color: string
      direction: string
      time: string
      /** Suffix appended to the 地支 to form the 时辰 name (e.g. '时'); '' for en
       *  (which shows a clock range instead). */
      shichenSuffix: string
      /** Separator between multiple 吉时. */
      shichenSep: string
      /** 用神五行 → localized 吉色 name (aligned with the ELEMENT_COLORS swatch). */
      colorName: Record<WuXingChar, string>
      /** 用神五行 → localized 吉方 name. */
      directionName: Record<WuXingChar, string>
      /** Contextual drill-in → the 八字 explainer (吉色/吉方/吉时 derive from 用神). */
      about: string
    }
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
     *  fields. Explains the two-person report + Yuel hand-off in detail. */
    compatibilityHint: string
    /** Shown inside the expanded 合盘 section when the solar birth year is missing —
     *  合盘 silently can't compute without it, so make the requirement explicit. */
    compatYearRequired: string
  }
  watchWidgets: string
  /** Honest blurb: free public 黄历 on Home / Lock / Watch; birth unlocks For you. */
  watchWidgetsNote: string
  /** Caption under the home-widget preview mockup. */
  widgetPreviewCaption: string
  /** Section label above Watch complication hot-zone previews. */
  watchPreviewCaption: string
  /** Labels for supported Watch complication families. */
  watchSlotCircular: string
  watchSlotRectangular: string
  watchSlotInline: string
  watchSlotCorner: string
  widgetSizeSmall: string
  widgetSizeMedium: string
  widgetSizeLarge: string
  /** @deprecated Kept for DailyCard templates; no longer shown on display settings. */
  watchStyleLabel: string
  watchTemplateModern: string
  watchTemplateLunar: string
  watchTemplateAlmanac: string
  watchTemplateAncient: string
  /** Picker label for the 月相 palette (applies to the shipping widget). */
  moonSkinLabel: string
  /** 月相 names keyed by synodic bucket — widget captions under the logo. */
  moonPhaseNames: Record<LunarPhaseName, string>
  /**
   * Chrome the native widget/watch faces paint. Written into the App Group with
   * the day window so WidgetKit renders app-locale copy instead of its own
   * table — the Swift constants are only a first-launch fallback.
   */
  widgetChrome: {
    /** 宜 column label. */
    good: string
    /** 忌 column label. */
    avoid: string
    /** 对你而言 label — short form, these slots are narrow. */
    forYou: string
    /** 日签 label. */
    tip: string
    /** Shown in place of 农历月日 when the almanac has no lunar date. */
    lunarFallback: string
    /** Widget body before the app has ever synced a window. */
    emptyHint: string
  }
  /** __DEV__ moon-phase mock controls. */
  devMoonPhaseLabel: string
  devMoonPhaseLive: string
  /** DEV row: scrub moon by civil day offset from today. */
  devMoonPhaseDayScrub: string
  devMoonPhaseDayToday: string
  devMoonPhaseNew: string
  devMoonPhaseFirst: string
  devMoonPhaseFull: string
  devMoonPhaseLast: string
  devMoonPhaseHint: string
  /** Small "coming soon" badge. */
  comingSoon: string
  /** Large-widget free footer label (preset daily tip lexicon). */
  widgetDayTipLabel: string
  /** 划词 AI follow-up chat over the personal 命书. NOTE: the full 命书 (with this
   *  chat) moved to Yuel in the Yuel/Yuun split; Yuun now shows only the free 概要.
   *  These strings are retained pending dictionary cleanup but are no longer wired. */
  readingChat: {
    title: string
    empty: string
    placeholder: string
    loading: string
    error: string
    proUnlimited: string
    buyCredits: string
    /** Must contain `{remaining}`. */
    freeRemaining: string
    /** Must contain `{remaining}`. */
    poolRemaining: string
    suggest1: string
    suggest2: string
    suggest3: string
  }
  /** CTA below the 生肖 reading that opens Yuel for full 合盘. */
  kindredComposeCta: string
  /** Cross-app data-sharing consent shown before the Yuel 合盘 hand-off. */
  kindredShareConsent: { title: string; body: string; confirm: string; cancel: string }
  /** Shown when the contact's birthday is 农历 — Yuel only accepts solar. */
  kindredComposeLunarNote: string
  /** 关系桥 (Auspice×Yuel) — 今日你和TA + 合婚择吉日 (the calendar-shaped
   *  relationship action; the deep 合盘 report stays in Yuel). */
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
  /** Shown when minting / opening the personal calendar subscription fails. */
  personalCalendarFailed: string
}

const zhHans: Strings = {
  appName: 'Yuun 黄历',
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
  eventSearch: '选时参考',
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
  eveningPush: '明日提醒',
  eveningPushHint: '仅当明天值得留意时（节气/节日）于晚 8 点提醒。',
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
  proTitle: 'Yuun Pro',
  proSubtitle: '公开黄历免费 · 生辰解锁「对你而言」 · Pro 深化解读与人生尺',
  proBenefits: [
    '对你而言 · 每条宜忌逐条解读（用神 · 吉色 · 吉时）',
    '完整人生时间线 · 大运 / 流年 / 流月 +「假如」反思探索',
    '自定义日期范围 + 个人黄历日历订阅',
    '命书深读 · 个人八字 / 紫微参考',
  ],
  proMonthly: '月度订阅',
  proAnnual: '年度订阅',
  proRestore: '恢复购买',
  legalDisclaimerShort:
    '基于传统历法与命理文化，仅供娱乐、文化探索与个人省思，不构成医疗、法律、财务或人生决策建议。',
  signInToSubscribe: '订阅前请先登录',
  signInBenefit: '登录后，订阅可在所有设备恢复，并在你使用「Yuel」等其他应用时延续。',
  signInWithGoogle: '使用 Google 登录',
  signInError: '登录失败，请重试。',
  signInForBirthTitle: '登录以保存生辰',
  signInForBirthBenefit: '生辰将安全保存到你的账号，便于跨设备同步到 Widget 与 Apple Watch。',
  birthMultiDeviceSync: '多设备同步生辰',
  birthMultiDeviceSyncHint: '关闭后，其他设备不会自动读取账号中的生辰；本机仍可使用。',
  birthSyncGatedMultiDevice: '多设备同步已关闭。开启后，此设备才能读取账号生辰。',
  birthSyncEnableMultiDevice: '开启多设备同步',
  birthConflictTitle: '生辰不一致',
  birthConflictBody: '本机与账号中的生辰不同。请选择保留哪一份。',
  birthConflictUseAccount: '使用账号资料',
  birthConflictUseLocal: '用本机资料替换账号',
  birthSaveFailed: '保存失败，请检查网络后重试。',
  birthSaving: '正在保存…',
  deleteAccount: '删除账号',
  deleteAccountConfirmTitle: '永久删除账号？',
  deleteAccountConfirmBody:
    '将永久删除：本人生辰与跨设备同步资料、Watch 凭据、推送注册、亲友/合盘相关服务端数据，以及同一账号下的阅读与对话历史。此操作不可撤销。App Store 订阅需另行取消。',
  deleteAccountCancel: '取消',
  deleteAccountConfirmCta: '永久删除',
  deleteAccountFailed: '删除失败，请稍后重试。',
  deleteAccountWorking: '正在删除…',
  accountSection: '账号',
  signedInLabel: '已登录',
  specializedActive: '专项时日参考 已启用',
  specializedUpsell: 'Pro · 解锁专项时日参考',
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
  familyEventsComingSoon: '即将开放',
  contentComingSoon: '内容编辑中',
  unlockFullSection: '解锁完整章节',
  swipeCalendarHint: '月历',
  swipeMeHint: '设置',
  almanacSection: '黄历',
  exploreSection: '探索',
  exploreExpand: '展开',
  exploreCollapse: '收起',
  openInToday: '在「今日」查看',
  settingsLibrary: '文库',
  settingsNotifications: '通知',
  settingsCalendars: '日历与同步',
  settingsLegal: '法律与说明',
  libraryTimeline: '人生时间轴',
  libraryMakeIf: '假如',
  glossaryTitle: '文化百科',
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
  timelineLiuyueUpsell: '→ 逐月流月详情 · Pro（本年及未来）',
  timelineAboutLuck: '什么是大运·流年',
  timelineZejiCta: '→ {year}年的吉日窗口',
  timelineFreePreviewNote:
    '免费版显示当前大运、今年流年与未来 6 个月流月；解锁 Pro 查看完整人生时间线。',
  timelineRemindToggle: '人生节点提醒',
  timelineRemindHint: '每月初与大运转换时，提醒你查看本月流月与人生时间线。',
  timelineRemindNeedBirth: '请先填写完整生辰（含性别），才能开启人生节点提醒。',
  timelineRemindNeedPush: '需要开启通知权限，才能接收人生节点提醒。',
  timelineAdvice: {
    吉: '此月能量偏顺，可考虑主动推进（文化参考，非建议）。',
    平: '此月能量平稳，宜按部就班、稳中求进（文化参考）。',
    凶: '此月能量偏逆，宜多休息、少硬撑（文化参考，非建议）。',
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
  makeifBackdrop: '命主干 · {domain}运 —— 选择之外，仍有命局底色可对照。',
  makeifCherrypick: '带回现实 · 借{el}行之力,{year}年顺势而为。',
  makeifDiff: {
    header: '对照 · 现实 vs 假如',
    realCol: '现实',
    altCol: '假如',
    forkRow: '分岔 · {age}岁',
    mergeRow: '复归 · {age}岁',
    help: '得助 ↑',
    even: '比和',
    harm: '受克 ↓',
    remedy: '解法',
    tapHint: '点任一行展开那一年的解读 · 受克↓ 处可看「解法」',
  },
  yinzheng: {
    prompt: '这一年你经历了什么?',
    lead: '那一年正逢',
    matchFrame: '命盘可对照这一点。',
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
  timelineInviteTitle: '看见你的人生时间线',
  timelineInviteBody: '录入生辰，展开大运与流年，探索另一种人生',
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
  birthCalendarLeap: '闰月',
  birthCalendarLunarHint: '输入农历月日；闰月请打开上方开关',
  birthShichenLabel: '出生时辰',
  birthShichenUnknown: '未知',
  birthGenderLabel: '性别',
  birthGenderMale: '男',
  birthGenderFemale: '女',
  birthCityLabel: '出生地（可选）',
  birthCityToggle: '添加出生地（可选，更精准）',
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
    fit: { 吉: '可留意', 平: '平稳', 凶: '宜谨慎' },
    summary: {
      吉: '今日五行对你偏顺（文化参考）——适合按自己的节奏推进想做的事。',
      平: '今日起伏不大（文化参考）——按计划稳步推进即可。',
      凶: '今日宜守不宜攻（文化参考）——低调收敛、避免冒进。',
    },
    why: '了解原因',
    deepRead: '深入解读',
    reason: {
      day_generates_self: '今日五行生扶你（文化参考），可按节奏推进',
      day_controls_self: '今日五行克你（文化参考），宜守不宜攻',
      self_generates_day: '今日略泄你的精力（文化参考），量力而行',
      self_controls_day: '今日你相对占上风（文化参考），可按计划行事',
      day_same_as_self: '今日与你同气（文化参考），平稳有助力',
      favorable_element_present: '今日五行正是你的用神（文化参考），格外有利',
      unfavorable_element_present: '今日五行为你的忌神（文化参考），谨慎为宜',
      personal_clash: '今日冲你的生肖（文化参考），避免重大决定',
    },
    setBirth: '设置出生日期',
    birthDatePlaceholder: 'YYYY-MM-DD',
    birthHint: '用于「对你而言」个性化',
    readingTitle: '你的命书',
    readingHint: '八字 + 紫微合参的完整个人解读',
    lucky: {
      color: '吉色',
      direction: '吉方',
      time: '吉时',
      shichenSuffix: '时',
      shichenSep: '、',
      colorName: { 木: '绿', 火: '红', 土: '黄', 金: '白', 水: '蓝' },
      directionName: { 木: '东', 火: '南', 土: '中', 金: '西', 水: '北' },
      about: '为什么是这些',
    },
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
    compatibilityToggle: '看你我如何相契',
    compatibilityHook: '打开后录入八字，解锁你们的关系合盘',
    compatibilityHint:
      '填写性别、时辰与出生地后，将解锁你们两人的关系合盘报告，可在 Yuel App 中查看。',
    compatYearRequired: '关系合盘需要完整的阳历出生年份 —— 请在上方「出生年份」填写并确认。',
  },
  watchWidgets: '桌面 · 锁屏 · Watch',
  watchWidgetsNote:
    '公开黄历免费：主屏小 / 中 / 大、锁屏组件、Apple Watch 都显示当日干支与宜忌（人人相同）。录入生辰后，「对你而言」会出现在 App、桌面组件与 Watch。打开 Yuun 任意一次即可刷新桌面组件；Watch 可独立刷新，首次配对需打开 iPhone 上的 Yuun 一次。Watch 填充系统表盘热区；宜忌优先放矩形两行槽。',
  widgetPreviewCaption: '主屏小组件',
  watchPreviewCaption: 'Watch 热区（系统表盘）',
  watchSlotCircular: '圆形',
  watchSlotRectangular: '矩形',
  watchSlotInline: '底边一行',
  watchSlotCorner: '表角',
  widgetSizeSmall: '小',
  widgetSizeMedium: '中',
  widgetSizeLarge: '大',
  watchStyleLabel: '表盘样式',
  watchTemplateModern: '极简',
  watchTemplateLunar: '月相',
  watchTemplateAlmanac: '黄历',
  watchTemplateAncient: '古风',
  moonSkinLabel: '月相',
  moonPhaseNames: {
    new: '新月',
    'waxing-crescent': '娥眉月',
    'first-quarter': '上弦月',
    'waxing-gibbous': '盈凸月',
    full: '满月',
    'waning-gibbous': '亏凸月',
    'last-quarter': '下弦月',
    'waning-crescent': '残月',
  },
  widgetChrome: {
    good: '宜',
    avoid: '忌',
    forYou: '对你',
    tip: '日签',
    lunarFallback: '农历',
    emptyHint: '打开 Yuun 同步今日黄历',
  },
  devMoonPhaseLabel: 'DEV · 月相预览',
  devMoonPhaseLive: '跟随系统日期',
  devMoonPhaseDayScrub: '按日预览（相对今天）',
  devMoonPhaseDayToday: '今天',
  devMoonPhaseNew: '朔',
  devMoonPhaseFirst: '上弦',
  devMoonPhaseFull: '望',
  devMoonPhaseLast: '下弦',
  devMoonPhaseHint:
    '仅开发构建。跟随系统日期会清除手机与手表的覆盖，恢复每日真实月相；按日预览以天为单位移动 terminator。',
  comingSoon: '即将推出',
  widgetDayTipLabel: '日签',
  readingChat: {
    title: '聊聊你的命盘',
    empty: '关于你自己的命盘，问我任何问题。',
    placeholder: '输入你的问题…',
    loading: '正在思考…',
    error: '出错了，请稍后再试。',
    proUnlimited: 'Yuun Pro · 无限畅聊',
    buyCredits: '对话次数已用完 — 点此获取更多。',
    freeRemaining: '还剩 {remaining} 次免费回复',
    poolRemaining: '本月还剩 {remaining} 次回复',
    suggest1: '我的优势在哪里？',
    suggest2: '我要注意些什么？',
    suggest3: '今年流年的文化参考是什么？',
  },
  kindredComposeCta: '在 Yuel 看完整合盘 →',
  kindredShareConsent: {
    title: '分享生辰给 Yuel?',
    body: '将把你和 TA 的出生信息发送到 Yuel,用于生成关系合盘。前几章免费阅读,完整报告在 Yuel 内解锁(下载并不会全部解锁)。仅在你同意后共享。',
    confirm: '同意并打开',
    cancel: '取消',
  },
  kindredComposeLunarNote: 'Yuel 暂仅支持阳历生日。可在编辑亲友时换成阳历再试。',
  pair: {
    todayHeading: '今日 · 你和TA',
    picksHeading: '为你俩择吉日',
    resonance: '同气',
    tension: '相激',
    neutral: '平和',
    resonanceLine: '今日两人气场相合，宜共事、相约、定大事。',
    tensionLine: '今日两人气场相激，各退一步，宜缓不宜急。',
    neutralLine: '今日两人气场平和，顺其自然即可。',
    loading: '对照中…',
    picksEmpty: '近期暂无格外契合的好日子，过段时间再看看。',
    shareCta: '分享好日子',
  },
  appleCalendarSection: '系统日历',
  personalCalendarRow: '对你而言 · 专属日历',
  personalCalendarHint: '把每天的宜忌参考同步到系统日历（Pro）',
  personalCalendarFailed: '暂时无法打开专属日历，请稍后重试。',
  appleCalendarSubscribeRow: '在 Apple 日历订阅黄历',
  appleCalendarSubscribeHint:
    '把每日干支、节气、宜忌同步到 iPhone / Mac 日历，不用打开 App 也能看见。',
}

const zhHant: Strings = {
  ...zhHans,
  appName: 'Yuun 黃曆',
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
  eveningPush: '明日提醒',
  eveningPushHint: '僅當明天值得留意時（節氣/節日）於晚 8 點提醒。',
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
  proTitle: 'Yuun Pro',
  proSubtitle: '公開黃曆免費 · 生辰解鎖「對你而言」 · Pro 深化解讀與人生尺',
  proBenefits: [
    '對你而言 · 每條宜忌逐條解讀（用神 · 吉色 · 吉時）',
    '完整人生時間線 · 大運 / 流年 / 流月 +「假如」反思探索',
    '自訂日期範圍 + 個人黃曆日曆訂閱',
    '命書深讀 · 個人八字 / 紫微參考',
  ],
  proMonthly: '月度訂閱',
  proAnnual: '年度訂閱',
  proRestore: '恢復購買',
  legalDisclaimerShort:
    '基於傳統曆法與命理文化，僅供娛樂、文化探索與個人省思，不構成醫療、法律、財務或人生決策建議。',
  signInToSubscribe: '訂閱前請先登入',
  signInBenefit: '登入後，訂閱可在所有裝置恢復，並在你使用「Yuel」等其他應用時延續。',
  signInWithGoogle: '使用 Google 登入',
  signInError: '登入失敗，請重試。',
  signInForBirthTitle: '登入以儲存生辰',
  signInForBirthBenefit: '生辰將安全儲存到你的帳號，便於跨裝置同步到 Widget 與 Apple Watch。',
  birthMultiDeviceSync: '多裝置同步生辰',
  birthMultiDeviceSyncHint: '關閉後，其他裝置不會自動讀取帳號中的生辰；本機仍可使用。',
  birthSyncGatedMultiDevice: '多裝置同步已關閉。開啟後，此裝置才能讀取帳號生辰。',
  birthSyncEnableMultiDevice: '開啟多裝置同步',
  birthConflictTitle: '生辰不一致',
  birthConflictBody: '本機與帳號中的生辰不同。請選擇保留哪一份。',
  birthConflictUseAccount: '使用帳號資料',
  birthConflictUseLocal: '用本機資料替換帳號',
  birthSaveFailed: '儲存失敗，請檢查網路後重試。',
  birthSaving: '正在儲存…',
  deleteAccount: '刪除帳號',
  deleteAccountConfirmTitle: '永久刪除帳號？',
  deleteAccountConfirmBody:
    '將永久刪除：本人生辰與跨裝置同步資料、Watch 憑證、推播註冊、親友/合盤相關服務端資料，以及同一帳號下的閱讀與對話歷史。此操作不可撤銷。App Store 訂閱需另行取消。',
  deleteAccountCancel: '取消',
  deleteAccountConfirmCta: '永久刪除',
  deleteAccountFailed: '刪除失敗，請稍後重試。',
  deleteAccountWorking: '正在刪除…',
  accountSection: '帳號',
  signedInLabel: '已登入',
  specializedActive: '專項時日參考 已啟用',
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
  familyEventsComingSoon: '即將開放',
  contentComingSoon: '內容編輯中',
  unlockFullSection: '解鎖完整章節',
  swipeCalendarHint: '月曆',
  swipeMeHint: '設定',
  almanacSection: '黃曆',
  exploreSection: '探索',
  exploreExpand: '展開',
  exploreCollapse: '收起',
  openInToday: '在「今日」查看',
  settingsLibrary: '文庫',
  settingsNotifications: '通知',
  settingsCalendars: '日曆與同步',
  settingsLegal: '法律與說明',
  libraryTimeline: '人生時間軸',
  libraryMakeIf: '假如',
  glossaryTitle: '文化百科',
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
  timelineLiuyueUpsell: '→ 逐月流月詳情 · Pro（本年及未來）',
  timelineAboutLuck: '什麼是大運·流年',
  timelineZejiCta: '→ {year}年的吉日窗口',
  timelineFreePreviewNote:
    '免費版顯示當前大運、今年流年與未來 6 個月流月；解鎖 Pro 查看完整人生時間線。',
  timelineRemindToggle: '人生節點提醒',
  timelineRemindHint: '每月初與大運轉換時，提醒你查看當月流月與人生時間線。',
  timelineRemindNeedBirth: '請先填寫完整生辰（含性別），才能開啟人生節點提醒。',
  timelineRemindNeedPush: '需要開啟通知權限，才能接收人生節點提醒。',
  timelineAdvice: {
    吉: '今月能量偏順，可考慮主動推進（文化參考，非建議）。',
    平: '今月能量平穩，宜按部就班、穩中求進（文化參考）。',
    凶: '今月能量偏逆，宜多休息、少硬撐（文化參考，非建議）。',
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
  makeifBackdrop: '命主幹 · {domain}運 —— 選擇之外，仍有命局底色可對照。',
  makeifCherrypick: '帶回現實 · 借{el}行之力,{year}年順勢而為。',
  makeifDiff: {
    header: '對照 · 現實 vs 假如',
    realCol: '現實',
    altCol: '假如',
    forkRow: '分岔 · {age}歲',
    mergeRow: '復歸 · {age}歲',
    help: '得助 ↑',
    even: '比和',
    harm: '受克 ↓',
    remedy: '解法',
    tapHint: '點任一行展開那一年的解讀 · 受克↓ 處可看「解法」',
  },
  yinzheng: {
    prompt: '這一年你經歷了什麼?',
    lead: '那一年正逢',
    matchFrame: '命盤可對照這一點。',
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
  timelineInviteTitle: '看見你的人生時間線',
  timelineInviteBody: '錄入生辰，展開大運與流年，探索另一種人生',
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
  birthCalendarLeap: '閏月',
  birthCalendarLunarHint: '輸入農曆月日；閏月請打開上方開關',
  birthShichenLabel: '出生時辰',
  birthShichenUnknown: '未知',
  birthGenderLabel: '性別',
  birthGenderMale: '男',
  birthGenderFemale: '女',
  birthCityLabel: '出生地（可選）',
  birthCityToggle: '新增出生地（可選，更精準）',
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
    fit: { 吉: '可留意', 平: '平穩', 凶: '宜謹慎' },
    summary: {
      吉: '今日五行對你偏順（文化參考）——適合按自己的節奏推進想做的事。',
      平: '今日起伏不大（文化參考）——按計畫穩步推進即可。',
      凶: '今日宜守不宜攻（文化參考）——低調收斂、避免冒進。',
    },
    why: '了解原因',
    deepRead: '深入解讀',
    reason: {
      day_generates_self: '今日五行生扶你（文化參考），可按節奏推進',
      day_controls_self: '今日五行剋你（文化參考），宜守不宜攻',
      self_generates_day: '今日略洩你的精力（文化參考），量力而行',
      self_controls_day: '今日你相對占上風（文化參考），可按計畫行事',
      day_same_as_self: '今日與你同氣（文化參考），平穩有助力',
      favorable_element_present: '今日五行正是你的用神（文化參考），格外有利',
      unfavorable_element_present: '今日五行為你的忌神（文化參考），謹慎為宜',
      personal_clash: '今日沖你的生肖（文化參考），避免重大決定',
    },
    setBirth: '設定出生日期',
    birthDatePlaceholder: 'YYYY-MM-DD',
    birthHint: '用於「對你而言」個性化',
    readingTitle: '你的命書',
    readingHint: '八字 + 紫微合參的完整個人解讀',
    lucky: {
      color: '吉色',
      direction: '吉方',
      time: '吉時',
      shichenSuffix: '時',
      shichenSep: '、',
      colorName: { 木: '綠', 火: '紅', 土: '黃', 金: '白', 水: '藍' },
      directionName: { 木: '東', 火: '南', 土: '中', 金: '西', 水: '北' },
      about: '為什麼是這些',
    },
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
    compatibilityToggle: '看你我如何相契',
    compatibilityHook: '打開後錄入八字，解鎖你們的關係合盤',
    compatibilityHint:
      '填寫性別、時辰與出生地後，將解鎖你們兩人的關係合盤報告，可在 Yuel App 中查看。',
    compatYearRequired: '關係合盤需要完整的陽曆出生年份 —— 請在上方「出生年份」填寫並確認。',
  },
  watchWidgets: '桌面 · 鎖屏 · Watch',
  watchWidgetsNote:
    '公開黃曆免費：主屏小 / 中 / 大、鎖屏元件、Apple Watch 都顯示當日干支與宜忌（人人相同）。錄入生辰後，「對你而言」會出現在 App、桌面元件與 Watch。打開 Yuun 任意一次即可重新整理桌面元件；Watch 可獨立重新整理，首次配對需打開 iPhone 上的 Yuun 一次。Watch 填充系統錶盤熱區；宜忌優先放矩形兩行槽。',
  widgetPreviewCaption: '主屏小組件',
  watchPreviewCaption: 'Watch 熱區（系統錶盤）',
  watchSlotCircular: '圓形',
  watchSlotRectangular: '矩形',
  watchSlotInline: '底邊一行',
  watchSlotCorner: '錶角',
  widgetSizeSmall: '小',
  widgetSizeMedium: '中',
  widgetSizeLarge: '大',
  watchStyleLabel: '錶盤樣式',
  watchTemplateModern: '極簡',
  watchTemplateLunar: '月相',
  watchTemplateAlmanac: '黃曆',
  watchTemplateAncient: '古風',
  moonSkinLabel: '月相',
  moonPhaseNames: {
    new: '新月',
    'waxing-crescent': '娥眉月',
    'first-quarter': '上弦月',
    'waxing-gibbous': '盈凸月',
    full: '滿月',
    'waning-gibbous': '虧凸月',
    'last-quarter': '下弦月',
    'waning-crescent': '殘月',
  },
  widgetChrome: {
    good: '宜',
    avoid: '忌',
    forYou: '對你',
    tip: '日籤',
    lunarFallback: '農曆',
    emptyHint: '打開 Yuun 同步今日黃曆',
  },
  devMoonPhaseLabel: 'DEV · 月相預覽',
  devMoonPhaseLive: '跟隨系統日期',
  devMoonPhaseDayScrub: '按日預覽（相對今天）',
  devMoonPhaseDayToday: '今天',
  devMoonPhaseNew: '朔',
  devMoonPhaseFirst: '上弦',
  devMoonPhaseFull: '望',
  devMoonPhaseLast: '下弦',
  devMoonPhaseHint:
    '僅開發構建。跟隨系統日期會清除手機與手錶的覆蓋，恢復每日真實月相；按日預覽以天為單位移動 terminator。',
  comingSoon: '即將推出',
  widgetDayTipLabel: '日籤',
  readingChat: {
    title: '聊聊你的命盤',
    empty: '關於你自己的命盤，問我任何問題。',
    placeholder: '輸入你的問題…',
    loading: '正在思考…',
    error: '發生錯誤，請稍後再試。',
    proUnlimited: 'Yuun Pro · 無限暢聊',
    buyCredits: '對話次數已用完 — 點此取得更多。',
    freeRemaining: '還剩 {remaining} 次免費回覆',
    poolRemaining: '本月還剩 {remaining} 次回覆',
    suggest1: '我的優勢在哪裡？',
    suggest2: '我要注意些什麼？',
    suggest3: '今年流年的文化參考是什麼？',
  },
  kindredComposeCta: '在 Yuel 看完整合盤 →',
  kindredShareConsent: {
    title: '分享生辰給 Yuel?',
    body: '將把你和 TA 的出生資訊傳送到 Yuel,用於產生關係合盤。前幾章免費閱讀,完整報告在 Yuel 內解鎖(下載並不會全部解鎖)。僅在你同意後共享。',
    confirm: '同意並開啟',
    cancel: '取消',
  },
  kindredComposeLunarNote: 'Yuel 暫僅支援陽曆生日。可在編輯親友時換成陽曆再試。',
  pair: {
    todayHeading: '今日 · 你和TA',
    picksHeading: '為你倆擇吉日',
    resonance: '同氣',
    tension: '相激',
    neutral: '平和',
    resonanceLine: '今日兩人氣場相合，宜共事、相約、定大事。',
    tensionLine: '今日兩人氣場相激，各退一步，宜緩不宜急。',
    neutralLine: '今日兩人氣場平和，順其自然即可。',
    loading: '對照中…',
    picksEmpty: '近期暫無格外契合的好日子，過段時間再看看。',
    shareCta: '分享好日子',
  },
  appleCalendarSection: '系統日曆',
  personalCalendarRow: '對你而言 · 專屬日曆',
  personalCalendarHint: '把每天的宜忌參考同步到系統日曆（Pro）',
  personalCalendarFailed: '暫時無法打開專屬日曆，請稍後重試。',
  appleCalendarSubscribeRow: '在 Apple 日曆訂閱黃曆',
  appleCalendarSubscribeHint:
    '把每日干支、節氣、宜忌同步到 iPhone / Mac 日曆，不用打開 App 也能看見。',
}

const ja: Strings = {
  appName: 'Yuun 暦',
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
  eveningPush: '明日のお知らせ',
  eveningPushHint: '明日が特別な日（祝日・二十四節気）のときだけ、夜8時にお知らせ。',
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
  proTitle: 'Yuun Pro',
  proSubtitle: '公開の黄暦は無料 · 生年月日で「あなたへ」 · Pro で深掘りと人生尺',
  proBenefits: [
    'あなたへ · 宜忌を一項目ずつ（用神 · 吉色 · 吉時）',
    '人生タイムライン全期間 · 大運 / 流年 / 流月 +「もしも」省思',
    '日付範囲のカスタム + 個人の暦カレンダー購読',
    '命書の深読み · 八字 / 紫微の個人参考',
  ],
  proMonthly: '月額プラン',
  proAnnual: '年額プラン',
  proRestore: '購入を復元',
  legalDisclaimerShort:
    '伝統暦法・命理文化に基づく娯楽・文化探索・個人的省思用。医療・法律・財務・人生判断の助言ではありません。',
  signInToSubscribe: 'ご登録の前にサインイン',
  signInBenefit:
    'サインインすると購読は全デバイスで復元でき、「Yuel」など他のアプリにも引き継げます。',
  signInWithGoogle: 'Google でサインイン',
  signInError: 'サインインに失敗しました。もう一度お試しください。',
  signInForBirthTitle: '生年月日時を保存するにはサインイン',
  signInForBirthBenefit: '生年月日はアカウントに安全に保存され、ウィジェットや Apple Watch と同期できます。',
  birthMultiDeviceSync: '複数デバイスで生年月日を同期',
  birthMultiDeviceSyncHint: 'オフにすると、他のデバイスはアカウントの生年月日を自動取得しません。この端末では引き続き使えます。',
  birthSyncGatedMultiDevice: '複数デバイス同期はオフです。オンにすると、この端末でアカウントの生年月日を読めます。',
  birthSyncEnableMultiDevice: '複数デバイス同期をオン',
  birthConflictTitle: '生年月日が一致しません',
  birthConflictBody: 'この端末とアカウントの生年月日が異なります。どちらを残しますか。',
  birthConflictUseAccount: 'アカウントの内容を使う',
  birthConflictUseLocal: 'この端末の内容でアカウントを上書き',
  birthSaveFailed: '保存に失敗しました。通信を確認して再試行してください。',
  birthSaving: '保存中…',
  deleteAccount: 'アカウントを削除',
  deleteAccountConfirmTitle: 'アカウントを完全に削除しますか？',
  deleteAccountConfirmBody:
    '次のデータは完全に削除されます：生年月日とデバイス同期データ、Watch 資格情報、プッシュ登録、親しい人／相性関連のサーバーデータ、同一アカウントの読書・会話履歴。この操作は取り消せません。App Store のサブスクリプションは別途解約が必要です。',
  deleteAccountCancel: 'キャンセル',
  deleteAccountConfirmCta: '完全に削除',
  deleteAccountFailed: '削除に失敗しました。しばらくしてから再試行してください。',
  deleteAccountWorking: '削除中…',
  accountSection: 'アカウント',
  signedInLabel: 'サインイン済み',
  specializedActive: '専門日時参考 適用中',
  specializedUpsell: 'Pro · 専門日時参考を解放',
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
  cultureTopicsTitle: '文化ガイド',
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
  familyEventsComingSoon: '近日公開',
  contentComingSoon: 'コンテンツ準備中',
  unlockFullSection: '全文を見る',
  swipeCalendarHint: 'カレンダー',
  swipeMeHint: '設定',
  almanacSection: '黄暦',
  exploreSection: '探索',
  exploreExpand: '開く',
  exploreCollapse: '閉じる',
  openInToday: '「今日」で見る',
  settingsLibrary: 'ライブラリ',
  settingsNotifications: '通知',
  settingsCalendars: 'カレンダーと同期',
  settingsLegal: '法務と説明',
  libraryTimeline: '人生タイムライン',
  libraryMakeIf: 'もしも',
  glossaryTitle: '文化ガイド',
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
  timelineProLocked: '人生タイムラインを全期間ひらく',
  timelineLiuyueUpsell: '→ 月ごとの流月 · Pro（今年から先）',
  timelineAboutLuck: '大運·流年とは',
  timelineZejiCta: '→ {year}年の吉日候補',
  timelineFreePreviewNote:
    '無料版では現在の大運・今年の流年・今後 6 か月の流月を表示。Pro で全期間をひらけます。',
  timelineRemindToggle: '人生の節目リマインド',
  timelineRemindHint: '毎月初めと大運の変わり目に、今月の流月と人生タイムラインをお知らせ。',
  timelineRemindNeedBirth: '人生の節目リマインドには、生年月日と性別の登録が必要です。',
  timelineRemindNeedPush: 'リマインドを受け取るには通知の許可が必要です。',
  timelineAdvice: {
    吉: '今月のエネルギーは追い風寄り。積極的に動く参考になり得ます（助言ではありません）。',
    平: '今月は穏やか。着実に進める文化上の参考です。',
    凶: '今月は抑え気味。休息を大切に（文化参考、助言ではありません）。',
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
  timelineHuajie: '対処：{el}の力を借り、静を守り貴人を頼みましょう。',
  makeifTiming: {
    frame: '今の命局のタイミング',
    archetypes: {
      expand: '攻めが活きる',
      hold: '守りが吉',
      move: '移動・遠出に向く',
      connect: 'ご縁・協働に向く',
    },
  },
  makeifBackdrop: '命の主軸 · {domain}運 —— 選択を超えて、命式の流れは残ります。',
  makeifCherrypick: '現実へ持ち帰る · {el}の力を借り、{year}年に動きましょう。',
  makeifDiff: {
    header: '対比 · 現実 vs もしも',
    realCol: '現実',
    altCol: 'もしも',
    forkRow: '分岐 · {age}歳',
    mergeRow: '合流 · {age}歳',
    help: '追い風 ↑',
    even: '拮抗',
    harm: '重荷 ↓',
    remedy: '対処法',
    tapHint: '行をタップでその年の解説 · 重荷↓ には「対処法」',
  },
  yinzheng: {
    prompt: 'この年、何がありましたか?',
    lead: 'その年はちょうど',
    matchFrame: '命式と対照できます。',
    noMatch: 'この年の命式は比較的穏やか —— 変化はあなた自身から。',
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
  timelineInviteTitle: '人生タイムラインを見る',
  timelineInviteBody: '生年月日を登録して大運・流年を表示。「もしも」の人生も試せます',
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
  birthCalendarLeap: '閏月',
  birthCalendarLunarHint: '旧暦の月日を入力。閏月の場合は上のスイッチをオンに',
  birthShichenLabel: '生まれた時辰',
  birthShichenUnknown: '不明',
  birthGenderLabel: '性別',
  birthGenderMale: '男性',
  birthGenderFemale: '女性',
  birthCityLabel: '出生地（任意）',
  birthCityToggle: '出生地を追加（任意・より正確に）',
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
      吉: '今日は流れが良い読み（文化参考）——やりたいことを進めるのに向いています。',
      平: '今日は起伏が少ない読み（文化参考）——計画どおり着実に進めれば十分です。',
      凶: '今日は攻めより守り（文化参考）——控えめに、無理は避けましょう。',
    },
    why: '理由を見る',
    deepRead: '詳しく読む',
    reason: {
      day_generates_self: '本日の五行があなたを生じる読み（文化参考）',
      day_controls_self: '本日の五行があなたを剋す読み（文化参考）、守りを',
      self_generates_day: '本日は気を消耗しがち（文化参考）、無理せず',
      self_controls_day: '本日は主導権を握りやすい読み（文化参考）',
      day_same_as_self: '本日はあなたと同気（文化参考）、安定',
      favorable_element_present: '本日の五行はあなたの用神（文化参考）',
      unfavorable_element_present: '本日の五行は忌神（文化参考）、慎重に',
      personal_clash: '本日はあなたの干支と冲（文化参考）、大事は避けて',
    },
    setBirth: '生年月日を設定',
    birthDatePlaceholder: 'YYYY-MM-DD',
    birthHint: '「あなたへ」の個別化に使用',
    readingTitle: 'あなたの鑑定書',
    readingHint: '八字 + 紫微を総合した個人鑑定',
    lucky: {
      color: '吉色',
      direction: '吉方',
      time: '吉時',
      shichenSuffix: 'の刻',
      shichenSep: '・',
      colorName: { 木: '緑', 火: '赤', 土: '黄', 金: '白', 水: '青' },
      directionName: { 木: '東', 火: '南', 土: '中央', 金: '西', 水: '北' },
      about: 'なぜこれら？',
    },
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
    compatibilityToggle: '二人の相性を観る',
    compatibilityHook: 'オンにして八字を入力すれば、二人の相性が見えます',
    compatibilityHint:
      '性別・時辰・出生地を入力すると、ふたりの相性レポートが解放されます（Yuel アプリで閲覧）。',
    compatYearRequired:
      '相性鑑定には西暦の出生年が必要です —— 上の「生まれ年」にご記入・ご確認ください。',
  },
  watchWidgets: 'ホーム · ロック · Watch',
  watchWidgetsNote:
    '公開の黄暦は無料：ホームの小/中/大、ロック画面、Apple Watch に当日の干支と宜忌（誰でも同じ）。生年月日を入れると「あなたへ」がアプリ・ウィジェット・Watch に出ます。Yuun を一度開けばホーム画面が更新されます。Watch は単独で更新でき、初回ペアリング時だけ iPhone の Yuun を開いてください。Watch はシステム文字盤のスロットを埋めます。宜忌は矩形の2行向き。',
  widgetPreviewCaption: 'ホーム画面',
  watchPreviewCaption: 'Watch スロット（システム文字盤）',
  watchSlotCircular: '円形',
  watchSlotRectangular: '矩形',
  watchSlotInline: '1行',
  watchSlotCorner: 'コーナー',
  widgetSizeSmall: '小',
  widgetSizeMedium: '中',
  widgetSizeLarge: '大',
  watchStyleLabel: '文字盤スタイル',
  watchTemplateModern: 'ミニマル',
  watchTemplateLunar: '月相',
  watchTemplateAlmanac: '黄暦',
  watchTemplateAncient: '古風',
  moonSkinLabel: '月相',
  moonPhaseNames: {
    new: '新月',
    'waxing-crescent': '三日月',
    'first-quarter': '上弦',
    'waxing-gibbous': '十三夜',
    full: '満月',
    'waning-gibbous': '寝待月',
    'last-quarter': '下弦',
    'waning-crescent': '有明月',
  },
  widgetChrome: {
    good: '向く',
    avoid: '避ける',
    forYou: 'あなたへ',
    tip: '一言',
    lunarFallback: '旧暦',
    emptyHint: 'Yuun を開いて今日の黄暦を同期',
  },
  devMoonPhaseLabel: 'DEV · 月相プレビュー',
  devMoonPhaseLive: 'システム日付に合わせる',
  devMoonPhaseDayScrub: '日単位プレビュー（今日基準）',
  devMoonPhaseDayToday: '今日',
  devMoonPhaseNew: '朔',
  devMoonPhaseFirst: '上弦',
  devMoonPhaseFull: '望',
  devMoonPhaseLast: '下弦',
  devMoonPhaseHint:
    '開発ビルドのみ。システム日付は iPhone と Watch の上書きを消し、日ごとの実際の月相に戻します。',
  comingSoon: '近日公開',
  widgetDayTipLabel: '今日の一言',
  readingChat: {
    title: 'あなたの命式について',
    empty: 'あなた自身の命式について何でも聞いてください。',
    placeholder: '質問を入力…',
    loading: '考えています…',
    error: 'エラーが発生しました。もう一度お試しください。',
    proUnlimited: 'Yuun Pro · 無制限',
    buyCredits: 'チャット回数を使い切りました — タップで追加。',
    freeRemaining: '無料の返信があと {remaining} 回',
    poolRemaining: '今月の返信があと {remaining} 回',
    suggest1: '私の強みは？',
    suggest2: '気をつけることは？',
    suggest3: '今年の流年を文化参考として読むには？',
  },
  kindredComposeCta: 'Yuel で本格相性鑑定 →',
  kindredShareConsent: {
    title: 'Yuel に生年月日を共有しますか?',
    body: 'あなたと相手の出生情報を Yuel に送り、相性鑑定を作成します。最初の数章は無料、完全版は Yuel 内でアンロックします(ダウンロードだけで全章解放ではありません)。同意した場合のみ共有します。',
    confirm: '同意して開く',
    cancel: 'キャンセル',
  },
  kindredComposeLunarNote: 'Yuel は新暦の誕生日のみ対応。編集画面で新暦に切り替えてください。',
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
  personalCalendarHint: '毎日の宜忌参考をシステムカレンダーに同期（Pro）',
  personalCalendarFailed: '専用カレンダーを開けませんでした。しばらくして再試行してください。',
  appleCalendarSubscribeRow: 'Apple カレンダーに暦を購読',
  appleCalendarSubscribeHint:
    '毎日の干支・節気・宜忌を iPhone / Mac のカレンダーへ同期。アプリを開かなくても確認できます。',
}

const en: Strings = {
  appName: 'Yuun',
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
  eveningPush: 'Tomorrow heads-up',
  eveningPushHint: 'An 8pm heads-up — only when tomorrow is notable (a festival or solar term).',
  holidayHeadsUp: 'Holiday heads-up',
  holidayHeadsUpHint: 'Night-before alert for public holidays / makeup workdays (mainland China).',
  privacy: 'Privacy',
  terms: 'Terms',
  openMonth: 'Calendar',
  discover: 'Discover',
  benming: 'Benming yr',
  nextSolarTerm: 'Next term',
  lunarLabel: 'Chinese calendar',
  personalClashLabel: 'Clashes today',
  unlockMore: 'Unlock more',
  proTitle: 'Yuun Pro',
  proSubtitle: 'Public almanac free · birth unlocks For you · Pro deepens the read',
  proBenefits: [
    'For you — every Good / Avoid explained (favorable element · color · hour)',
    'Your whole life in 10-year cycles — decade, year, month + what-if reflection',
    'Custom date-picker range + personal almanac calendar subscription',
    'Chart deep-read — personal Ba Zi / Zi Wei reference',
  ],
  proMonthly: 'Monthly',
  proAnnual: 'Annual',
  proRestore: 'Restore purchase',
  legalDisclaimerShort:
    'Based on traditional almanac and chart culture — for entertainment, cultural exploration, and personal reflection only. Not medical, legal, financial, or life advice.',
  signInToSubscribe: 'Sign in to subscribe',
  signInBenefit:
    'Signing in lets your subscription restore on every device and carry into other apps like Yuel.',
  signInWithGoogle: 'Sign in with Google',
  signInError: 'Sign-in failed. Please try again.',
  signInForBirthTitle: 'Sign in to save birth info',
  signInForBirthBenefit: 'Birth info is saved securely to your account so it can sync across devices, widgets, and Apple Watch.',
  birthMultiDeviceSync: 'Sync birth across devices',
  birthMultiDeviceSyncHint: 'When off, other devices will not automatically read account birth info; this device still works.',
  birthSyncGatedMultiDevice: 'Multi-device sync is off. Turn it on so this device can read account birth info.',
  birthSyncEnableMultiDevice: 'Enable multi-device sync',
  birthConflictTitle: 'Birth info differs',
  birthConflictBody: 'This device and your account have different birth info. Choose which to keep.',
  birthConflictUseAccount: 'Use account data',
  birthConflictUseLocal: 'Replace account with this device',
  birthSaveFailed: 'Save failed. Check your connection and try again.',
  birthSaving: 'Saving…',
  deleteAccount: 'Delete account',
  deleteAccountConfirmTitle: 'Permanently delete account?',
  deleteAccountConfirmBody:
    'This permanently deletes: your birth info and cross-device sync data, Watch credentials, push registrations, people/compatibility server data, and reading/chat history under this account. This cannot be undone. Cancel App Store subscriptions separately.',
  deleteAccountCancel: 'Cancel',
  deleteAccountConfirmCta: 'Delete permanently',
  deleteAccountFailed: 'Delete failed. Please try again later.',
  deleteAccountWorking: 'Deleting…',
  accountSection: 'Account',
  signedInLabel: 'Signed in',
  specializedActive: 'Specialized timing reference on',
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
  cultureHubBlurb: 'Festivals · solar terms · twelve hours · stem-branch · Four Pillars · Ziwei',
  cultureWikipediaCta: 'Learn more on Wikipedia',
  ziweiChartComingSoon: 'Interactive chart coming soon',
  seasonSpring: 'Spring',
  seasonSummer: 'Summer',
  seasonAutumn: 'Autumn',
  seasonWinter: 'Winter',
  solarTermsSection: 'Solar terms',
  festivalsSection: '8 Festivals',
  familyEventsSection: 'Family events',
  familyEventsComingSoon: 'Coming soon',
  contentComingSoon: 'Content coming soon',
  unlockFullSection: 'Unlock full section',
  swipeCalendarHint: 'Calendar',
  swipeMeHint: 'Settings',
  almanacSection: 'Almanac',
  exploreSection: 'Explore',
  exploreExpand: 'Show',
  exploreCollapse: 'Hide',
  openInToday: 'Open on Today',
  settingsLibrary: 'Library',
  settingsNotifications: 'Notifications',
  settingsCalendars: 'Calendars & sync',
  settingsLegal: 'Legal',
  libraryTimeline: 'Life timeline',
  libraryMakeIf: 'What if',
  glossaryTitle: 'Culture guide',
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
  timelineLiuyueUpsell: '→ Monthly detail (流月) · Pro — this year & ahead',
  timelineAboutLuck: 'What are 大运 & 流年?',
  timelineZejiCta: '→ Best dates in {year}',
  timelineFreePreviewNote:
    'Free shows your current decade, this year, and the next 6 months. Unlock Pro for the full life timeline.',
  timelineRemindToggle: 'Timeline reminders',
  timelineRemindHint: 'A nudge at each month start and 大运 shift to check your timeline.',
  timelineRemindNeedBirth:
    'Add your full birth details (including gender) to enable timeline reminders.',
  timelineRemindNeedPush: 'Notification permission is required for timeline reminders.',
  timelineAdvice: {
    吉: 'This month reads supportive — a cultural reference for initiative, not advice.',
    平: 'Steady energy this month — a cultural reference for a measured pace.',
    凶: 'This month reads counter — rest and avoid overexerting (cultural reference, not advice).',
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
    'Your real line · a {domain} chapter — beyond the choice, the underlying pattern remains.',
  makeifCherrypick: 'Carry it back · lean on {el}, act around {year}.',
  makeifDiff: {
    header: 'Side-by-side · Real vs What-If',
    realCol: 'Real',
    altCol: 'What-If',
    forkRow: 'Fork · age {age}',
    mergeRow: 'Merge · age {age}',
    help: 'favored ↑',
    even: 'in balance',
    harm: 'strained ↓',
    remedy: 'remedy',
    tapHint: 'Tap a row to read that year · tap a strained ↓ year for a remedy',
  },
  yinzheng: {
    prompt: 'What happened that year?',
    lead: 'That year carried ',
    matchFrame: 'you can set beside your chart.',
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
  timelineBannerHint: 'Decade · year · month pillars',
  timelineInviteTitle: 'See your life in 10-year chapters',
  timelineInviteBody:
    'Add your birth to map decade and year chapters — and explore what-if branches',
  ganzhiStemsTitle: 'Ten Stems',
  ganzhiBranchesTitle: 'Twelve Branches',
  ganzhiSixtyTitle: 'Sixty Jiazi',
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
  birthCalendarLunar: 'Chinese calendar',
  birthCalendarLeap: 'Leap month',
  birthCalendarLunarHint:
    'Enter the Chinese-calendar month and day. Turn on Leap month when needed.',
  birthShichenLabel: 'Birth hour',
  birthShichenUnknown: 'Unknown',
  birthGenderLabel: 'Gender',
  birthGenderMale: 'Male',
  birthGenderFemale: 'Female',
  birthCityLabel: 'Birth city (optional)',
  birthCityToggle: 'Add birth city (optional · more precise)',
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
      吉: "Today's chart reads supportive (cultural reference) — a steady day to move on what you have in mind.",
      平: 'An even day on the chart (cultural reference) — keep to your plan at a measured pace.',
      凶: "Today's chart reads cautious (cultural reference) — hold back and avoid overextending.",
    },
    why: 'See why',
    deepRead: 'Go deeper',
    reason: {
      day_generates_self: "Today's element nourishes you on the chart (cultural reference)",
      day_controls_self:
        "Today's element restrains you on the chart (cultural reference) — hold steady",
      self_generates_day: 'Today drains your energy a little (cultural reference) — pace yourself',
      self_controls_day: 'You read as holding the upper hand today (cultural reference)',
      day_same_as_self:
        'Today is in tune with you on the chart (cultural reference) — steady support',
      favorable_element_present: "Today's element is your favorable one (cultural reference)",
      unfavorable_element_present:
        "Today's element is unfavorable for you (cultural reference) — pace yourself",
      personal_clash:
        'Today clashes with your earthly branch (cultural reference) — avoid big decisions',
    },
    setBirth: 'Set birth date',
    birthDatePlaceholder: 'YYYY-MM-DD',
    birthHint: 'Powers "For you" personalization',
    readingTitle: 'Your Reading',
    readingHint: 'Your full personal reading — BaZi + Zi Wei',
    lucky: {
      color: 'Favorable element',
      direction: 'Direction',
      time: 'Hours',
      shichenSuffix: '',
      shichenSep: ', ',
      colorName: { 木: 'Green', 火: 'Red', 土: 'Yellow', 金: 'White', 水: 'Blue' },
      directionName: { 木: 'East', 火: 'South', 土: 'Center', 金: 'West', 水: 'North' },
      about: 'Why these?',
    },
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
    lunar: 'Chinese calendar',
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
    compatibilityToggle: 'See how your charts align',
    compatibilityHook: 'Switch on + add their 八字 to unlock your compatibility report',
    compatibilityHint:
      'Add gender, birth hour and birthplace to unlock a relationship report for the two of you — viewable in the Yuel app.',
    compatYearRequired:
      'Compatibility needs the full solar birth year — fill in and confirm “Birth year” above.',
  },
  watchWidgets: 'Home · Lock · Watch',
  watchWidgetsNote:
    'Public almanac is free: Home Small/Medium/Large, Lock Screen widgets, and Apple Watch show today’s stem-branch and Good / Avoid — the same for everyone. Add birth info to unlock For you on the app, widgets, and Watch. Open Yuun once (any screen) to refresh home widgets; Watch can refresh on its own after the first pairing opens iPhone Yuun. Watch fills system-face slots; prefer rectangular for Good / Avoid.',
  widgetPreviewCaption: 'Home Screen',
  watchPreviewCaption: 'Watch slots (system faces)',
  watchSlotCircular: 'Circular',
  watchSlotRectangular: 'Rectangular',
  watchSlotInline: 'Inline',
  watchSlotCorner: 'Corner',
  widgetSizeSmall: 'Small',
  widgetSizeMedium: 'Medium',
  widgetSizeLarge: 'Large',
  watchStyleLabel: 'Watch styles',
  watchTemplateModern: 'Minimal',
  watchTemplateLunar: 'Moon',
  watchTemplateAlmanac: 'Almanac',
  watchTemplateAncient: 'Classical',
  moonSkinLabel: 'Moon skin',
  moonPhaseNames: {
    new: 'New Moon',
    'waxing-crescent': 'Waxing Crescent',
    'first-quarter': 'First Quarter',
    'waxing-gibbous': 'Waxing Gibbous',
    full: 'Full Moon',
    'waning-gibbous': 'Waning Gibbous',
    'last-quarter': 'Last Quarter',
    'waning-crescent': 'Waning Crescent',
  },
  widgetChrome: {
    good: 'Good',
    avoid: 'Avoid',
    forYou: 'For you',
    tip: 'Tip',
    lunarFallback: 'Lunar',
    emptyHint: 'Open Yuun to sync today’s almanac',
  },
  devMoonPhaseLabel: 'DEV · Moon phase',
  devMoonPhaseLive: 'Follow system date',
  devMoonPhaseDayScrub: 'Day scrub (vs today)',
  devMoonPhaseDayToday: 'Today',
  devMoonPhaseNew: 'New',
  devMoonPhaseFirst: 'First Q',
  devMoonPhaseFull: 'Full',
  devMoonPhaseLast: 'Last Q',
  devMoonPhaseHint:
    'Dev only. Follow system date clears the phone and Watch overrides and restores each day’s real phase; day scrub moves the terminator one civil day at a time.',
  comingSoon: 'Soon',
  widgetDayTipLabel: 'Tip',
  readingChat: {
    title: 'Ask about your chart',
    empty: 'Ask anything about your own chart.',
    placeholder: 'Type a question…',
    loading: 'Thinking…',
    error: 'Something went wrong. Please try again.',
    proUnlimited: 'Yuun Pro · unlimited',
    buyCredits: "You're out of chat replies — tap to get more.",
    freeRemaining: '{remaining} free replies left',
    poolRemaining: '{remaining} replies left this month',
    suggest1: 'What are my strengths?',
    suggest2: 'What should I watch out for?',
    suggest3: 'How does this year read on my chart (cultural reference)?',
  },
  kindredComposeCta: 'Open full reading in Yuel →',
  kindredShareConsent: {
    title: 'Share birth details with Yuel?',
    body: 'We will send both birth details to Yuel to generate your compatibility reading. The first chapters are free; the full report unlocks inside Yuel (downloading does not unlock everything). Shared only with your consent.',
    confirm: 'Agree & open',
    cancel: 'Cancel',
  },
  kindredComposeLunarNote:
    'Yuel supports solar birthdays only. Edit this person to a solar date and try again.',
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
  personalCalendarHint: 'Sync daily almanac reference to the system Calendar (Pro)',
  personalCalendarFailed: "Couldn't open your personal calendar — please try again.",
  appleCalendarSubscribeRow: 'Subscribe in Apple Calendar',
  appleCalendarSubscribeHint:
    'Sync daily stem-branch (干支), solar terms, and Good / Avoid to your iPhone / Mac Calendar so you see them without opening the app.',
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
