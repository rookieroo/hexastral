/**
 * @zhop/astro-core — 日历通书 (Daily Almanac)
 *
 * 基于当日天干五行推算宜忌、吉色、吉方。
 * 纯数学计算，无网络请求，可同步执行。
 */

import {
  BRANCH_ZODIAC,
  EARTHLY_BRANCHES,
  STEM_WUXING,
  WUXING_GENERATE,
  WUXING_OVERCOME,
} from './constants'
import { getFourPillars, toJulianDay } from './ganzhi'
import { getMonthByJie } from './jieqi'
import type { EarthlyBranch, HeavenlyStem, WuXing } from './types'

// ── 五行辅助 ─────────────────────────────────────────────────

/** 五行 → 生我的元素 (母元素) */
const WUXING_MOTHER: Record<WuXing, WuXing> = {
  木: '水',
  火: '木',
  土: '火',
  金: '土',
  水: '金',
}

/** 五行 → 吉色 */
const ELEMENT_COLOR: Record<WuXing, string> = {
  木: '绿色',
  火: '红色',
  土: '黄色',
  金: '白色',
  水: '黑色',
}

/** 五行 → 吉方 */
const ELEMENT_DIRECTION: Record<WuXing, string> = {
  木: '东方',
  火: '南方',
  土: '中央',
  金: '西方',
  水: '北方',
}

/** 今日宜 */
const ELEMENT_DOS: Record<WuXing, string[]> = {
  木: ['学习进修', '制定计划', '植树园艺'],
  火: ['社交拓展', '展示推广', '喜庆宴会'],
  土: ['房产事务', '商业谈判', '整理收纳'],
  金: ['财务决策', '签署合同', '购置器物'],
  水: ['研究学问', '旅行远行', '静思内观'],
}

/** 今日忌 */
const ELEMENT_DONTS: Record<WuXing, string[]> = {
  木: ['动刀剪锋器', '与人争执冲突'],
  火: ['急躁冒进', '用火不慎'],
  土: ['拖延懈怠', '挖土动土'],
  金: ['流血外科手术', '口舌是非'],
  水: ['涉水弄湿', '犹豫不决'],
}

/** 无命盘时的默认运势评分 */
const DEFAULT_RATING: Record<WuXing, 1 | 2 | 3 | 4 | 5> = {
  木: 4,
  火: 4,
  土: 3,
  金: 3,
  水: 4,
}

// ── 建除十二神 ───────────────────────────────────────────────

/** 建除十二神 — sequence of the 12 day-officers. */
export const TWELVE_OFFICERS = [
  '建',
  '除',
  '满',
  '平',
  '定',
  '执',
  '破',
  '危',
  '成',
  '收',
  '开',
  '闭',
] as const

export type DayOfficer = (typeof TWELVE_OFFICERS)[number]

/**
 * 建除十二神 for a day. The officer is 建 on the day whose 地支 equals the
 * 节气-based 月建 (月柱地支); each subsequent 地支 advances one officer. Pure +
 * deterministic — derived from the month + day pillars, no external anchor.
 *
 * @param monthBranch 月柱地支 — `getFourPillars(...).month.branch`
 * @param dayBranch   日柱地支 — `getFourPillars(...).day.branch`
 */
export function jianChu(monthBranch: EarthlyBranch, dayBranch: EarthlyBranch): DayOfficer {
  const m = EARTHLY_BRANCHES.indexOf(monthBranch)
  const d = EARTHLY_BRANCHES.indexOf(dayBranch)
  const idx = (((d - m) % 12) + 12) % 12
  return TWELVE_OFFICERS[idx]!
}

/**
 * 建除十二神 → 宜忌 base preset — canonical 选择 knowledge (public-domain).
 *
 * This is the deterministic **base** 宜忌; the full per-神煞 corpus is optional
 * later enrichment. Verbs use the standard 黄历 activity vocabulary so reverse-
 * 择日 search can match an event keyword against `good` / `bad`.
 */
export const OFFICER_YIJI: Record<DayOfficer, { good: readonly string[]; bad: readonly string[] }> =
  {
    建: { good: ['出行', '祈福', '求财', '见贵'], bad: ['动土', '破土', '安葬'] },
    除: { good: ['除服', '疗病', '出行', '沐浴'], bad: ['嫁娶', '开市', '安床'] },
    满: { good: ['祭祀', '祈福', '开市', '交易', '纳财'], bad: ['安葬', '求医', '栽种'] },
    平: { good: ['修造', '嫁娶', '安床', '涂泥'], bad: ['求医', '栽种'] },
    定: { good: ['嫁娶', '开市', '入学', '修造', '安床'], bad: ['诉讼', '出行', '求医'] },
    执: { good: ['嫁娶', '立券', '交易', '捕捉', '修造'], bad: ['开市', '移徙', '出行'] },
    破: { good: ['求医', '破屋', '拆卸'], bad: ['嫁娶', '开市', '立券', '动土', '出行'] },
    危: { good: ['祭祀', '安床'], bad: ['出行', '嫁娶', '登高', '行船'] },
    成: { good: ['开市', '嫁娶', '出行', '入学', '动土', '立券', '入宅'], bad: ['诉讼'] },
    收: { good: ['嫁娶', '纳财', '入仓', '纳畜', '交易'], bad: ['安葬', '出行', '开市'] },
    开: { good: ['开市', '出行', '入学', '修造', '动土', '祈福'], bad: ['安葬'] },
    闭: { good: ['安葬', '补垣', '塞穴', '筑堤'], bad: ['开市', '出行', '求医', '动土'] },
  }

// ── 二十八宿 (28 lunar mansions) ─────────────────────────────

/** 七曜 — the luminary that rules a mansion (locked to the Gregorian weekday). */
export type Luminary = '日' | '月' | '火' | '水' | '木' | '金' | '土'

/** 四象 — the celestial quadrant a mansion belongs to. */
export type Quadrant = '青龙' | '玄武' | '白虎' | '朱雀'

export interface TwentyEightMansion {
  /** 宿名, e.g. "角" */
  name: string
  /** 七曜值日 (rules its weekday) */
  luminary: Luminary
  /** 配属动物, e.g. "蛟" (角木蛟) */
  animal: string
  /** 四象 (东青龙 / 北玄武 / 西白虎 / 南朱雀) */
  quadrant: Quadrant
  /** 吉凶 — common 二十八宿吉凶歌 attribution; advisory (base 宜忌 comes from 建除) */
  lucky: boolean
  /** 0-based index in the 角-start 值日 order */
  index: number
}

/**
 * 二十八宿 in 值日 order (starts at 角). Each mansion's 七曜 is locked to a weekday:
 * the 28-day cycle = 4 × 7, so the 七曜 repeats every 7 days aligned to the Gregorian
 * week — this is the very origin of the 日月火水木金土 weekday names.
 *
 * Tuple: [name, 七曜, 动物, 吉]. 吉凶 follows the common 二十八宿吉凶歌 (14 吉 / 14 凶).
 */
const MANSION_DATA: ReadonlyArray<
  [name: string, luminary: Luminary, animal: string, lucky: boolean]
> = [
  // 东方青龙
  ['角', '木', '蛟', true],
  ['亢', '金', '龙', false],
  ['氐', '土', '貉', false],
  ['房', '日', '兔', true],
  ['心', '月', '狐', false],
  ['尾', '火', '虎', true],
  ['箕', '水', '豹', true],
  // 北方玄武
  ['斗', '木', '獬', true],
  ['牛', '金', '牛', false],
  ['女', '土', '蝠', false],
  ['虚', '日', '鼠', false],
  ['危', '月', '燕', false],
  ['室', '火', '猪', true],
  ['壁', '水', '貐', true],
  // 西方白虎
  ['奎', '木', '狼', true],
  ['娄', '金', '狗', true],
  ['胃', '土', '雉', true],
  ['昴', '日', '鸡', false],
  ['毕', '月', '乌', true],
  ['觜', '火', '猴', false],
  ['参', '水', '猿', false],
  // 南方朱雀
  ['井', '木', '犴', true],
  ['鬼', '金', '羊', false],
  ['柳', '土', '獐', false],
  ['星', '日', '马', false],
  ['张', '月', '鹿', true],
  ['翼', '火', '蛇', false],
  ['轸', '水', '蚓', true],
]

const QUADRANTS: readonly Quadrant[] = ['青龙', '玄武', '白虎', '朱雀']

/** All 28 mansions, fully resolved, in 值日 order. */
export const TWENTY_EIGHT_MANSIONS: readonly TwentyEightMansion[] = MANSION_DATA.map(
  ([name, luminary, animal, lucky], index) => ({
    name,
    luminary,
    animal,
    quadrant: QUADRANTS[Math.floor(index / 7)]!,
    lucky,
    index,
  })
)

/** 七曜 → Gregorian weekday (`Date.getUTCDay()`: 0=Sun). Validates the anchor. */
export const LUMINARY_WEEKDAY: Record<Luminary, number> = {
  日: 0,
  月: 1,
  火: 2,
  水: 3,
  木: 4,
  金: 5,
  土: 6,
}

/**
 * Anchor: 1998-03-15 = 房宿 (index 3 in the 角-start 值日 order).
 *
 * Verified three independent ways — do NOT change this offset without re-checking
 * against a published 通书:
 *   1. The 二十八宿值日 formula worked example (CSDN 4500133) gives 1998-03-15 → 房.
 *   2. 1998-03-15 was a Sunday and 房 is a 日曜 mansion (七曜↔weekday lock).
 *   3. Cross-checked 2026-06-12 → 娄 against huangli.com (西方娄金狗, Friday).
 */
const MANSION_ANCHOR_JD = toJulianDay(1998, 3, 15)
const MANSION_ANCHOR_INDEX = 3

/** 当日二十八宿值日 — fixed 28-day modulo cycle (pure math, no external data). */
export function twentyEightMansions(date: {
  year: number
  month: number
  day: number
}): TwentyEightMansion {
  const jd = toJulianDay(date.year, date.month, date.day)
  const diff = Math.floor(jd - MANSION_ANCHOR_JD)
  const idx = (((MANSION_ANCHOR_INDEX + diff) % 28) + 28) % 28
  return TWENTY_EIGHT_MANSIONS[idx]!
}

// ── 日冲煞 (day clash + 三煞 direction) ───────────────────────

/** 日支三合局 → 三煞方位 (申子辰煞南 / 寅午戌煞北 / 巳酉丑煞东 / 亥卯未煞西) */
const SANSHA_DIRECTION: Record<EarthlyBranch, string> = {
  申: '南',
  子: '南',
  辰: '南',
  寅: '北',
  午: '北',
  戌: '北',
  巳: '东',
  酉: '东',
  丑: '东',
  亥: '西',
  卯: '西',
  未: '西',
}

export interface DayClash {
  /** 所冲地支 (六冲) */
  branch: EarthlyBranch
  /** 所冲生肖 */
  zodiac: string
}

/** 当日冲 (六冲生肖) + 煞 (三煞方位)。 */
export function dayClash(dayBranch: EarthlyBranch): { clash: DayClash; evilDirection: string } {
  const di = EARTHLY_BRANCHES.indexOf(dayBranch)
  const clashBranch = EARTHLY_BRANCHES[(di + 6) % 12]!
  return {
    clash: { branch: clashBranch, zodiac: BRANCH_ZODIAC[clashBranch] },
    evilDirection: SANSHA_DIRECTION[dayBranch],
  }
}

// ── 黄道黑道十二神 (the day's 值神) ────────────────────────────

/** 黄道黑道十二神名 (青龙起，顺行)。 */
export type DayGodName =
  | '青龙'
  | '明堂'
  | '天刑'
  | '朱雀'
  | '金匮'
  | '天德'
  | '白虎'
  | '玉堂'
  | '天牢'
  | '玄武'
  | '司命'
  | '勾陈'

/** 值神序列 + 黄道(吉)/黑道(凶)。六黄道: 青龙·明堂·金匮·天德·玉堂·司命。 */
const DAY_GOD_SEQUENCE: ReadonlyArray<readonly [DayGodName, boolean]> = [
  ['青龙', true],
  ['明堂', true],
  ['天刑', false],
  ['朱雀', false],
  ['金匮', true],
  ['天德', true],
  ['白虎', false],
  ['玉堂', true],
  ['天牢', false],
  ['玄武', false],
  ['司命', true],
  ['勾陈', false],
]

/**
 * 月支 → 青龙(值神序列起点)所在地支。
 * 口诀：寅申须加子，卯酉却居寅，辰戌龙位上，巳亥午中存，子午临申地，丑未戌相寻。
 */
const QINGLONG_START: Record<EarthlyBranch, EarthlyBranch> = {
  寅: '子',
  申: '子',
  卯: '寅',
  酉: '寅',
  辰: '辰',
  戌: '辰',
  巳: '午',
  亥: '午',
  子: '申',
  午: '申',
  丑: '戌',
  未: '戌',
}

/** 当日值神 (黄道黑道十二神)。`lucky` = 黄道(吉)。 */
export interface DayGod {
  name: DayGodName
  /** 黄道吉日 = true；黑道凶日 = false。 */
  lucky: boolean
}

/**
 * 当日黄道黑道值神 —— 由月建(月支)定青龙起点，日支顺数十二神。纯查表，无外部锚点。
 *
 * @param monthBranch 节气-based 月建地支 (与 jianChu 同源)
 * @param dayBranch   日柱地支
 */
export function huangHeiDao(monthBranch: EarthlyBranch, dayBranch: EarthlyBranch): DayGod {
  const start = QINGLONG_START[monthBranch]
  const idx =
    (((EARTHLY_BRANCHES.indexOf(dayBranch) - EARTHLY_BRANCHES.indexOf(start)) % 12) + 12) % 12
  const [name, lucky] = DAY_GOD_SEQUENCE[idx]!
  return { name, lucky }
}

// ── 彭祖百忌 (day-stem + day-branch taboos) ───────────────────

/** 彭祖百忌·天干 (甲不开仓…)。public-domain 黄历 corpus. */
const PENGZU_STEM: Record<HeavenlyStem, string> = {
  甲: '不开仓财物耗散',
  乙: '不栽植千株不长',
  丙: '不修灶必见灾殃',
  丁: '不剃头头必生疮',
  戊: '不受田田主不祥',
  己: '不破券二比并亡',
  庚: '不经络织机虚张',
  辛: '不合酱主人不尝',
  壬: '不汲水更难提防',
  癸: '不词讼理弱敌强',
}

/** 彭祖百忌·地支 (子不问卜…)。 */
const PENGZU_BRANCH: Record<EarthlyBranch, string> = {
  子: '不问卜自惹祸殃',
  丑: '不冠带主不还乡',
  寅: '不祭祀神鬼不尝',
  卯: '不穿井水泉不香',
  辰: '不哭泣必主重丧',
  巳: '不远行财物伏藏',
  午: '不苫盖屋主更张',
  未: '不服药毒气入肠',
  申: '不安床鬼祟入房',
  酉: '不会客醉坐颠狂',
  戌: '不吃犬作怪上床',
  亥: '不嫁娶不利新郎',
}

/** 彭祖百忌 (按日柱干支)。 */
export interface PengZuTaboo {
  /** 天干忌 (含干，如 "甲不开仓财物耗散") */
  stem: string
  /** 地支忌 (含支，如 "子不问卜自惹祸殃") */
  branch: string
}

/** 当日彭祖百忌 —— 按日柱天干 + 地支查表。 */
export function pengZuTaboo(dayStem: HeavenlyStem, dayBranch: EarthlyBranch): PengZuTaboo {
  return {
    stem: `${dayStem}${PENGZU_STEM[dayStem]}`,
    branch: `${dayBranch}${PENGZU_BRANCH[dayBranch]}`,
  }
}

// ── 类型 ─────────────────────────────────────────────────────

export type ElementRelation = '生我' | '克我' | '我生' | '我克' | '同类'

/** Relation of `dayElement` acting on the 日主 (`dayMasterElement`), from 日主's view. */
function elementRelationOf(dayElement: WuXing, dayMasterElement: WuXing): ElementRelation {
  if (dayMasterElement === dayElement) return '同类'
  if (WUXING_GENERATE[dayElement] === dayMasterElement) return '生我'
  if (WUXING_OVERCOME[dayElement] === dayMasterElement) return '克我'
  if (WUXING_GENERATE[dayMasterElement] === dayElement) return '我生'
  return '我克'
}

/** 日主-relation → 综合吉凶评分 (生我 most favorable, 克我 least). */
const RELATION_RATING: Record<ElementRelation, 1 | 2 | 3 | 4 | 5> = {
  生我: 5,
  同类: 4,
  我生: 3,
  我克: 3,
  克我: 2,
}

export interface DailyAlmanac {
  /** 当日干支，e.g. "甲子" */
  todayGanZhi: string
  /** 当日天干五行 */
  todayElement: WuXing
  /** 当日地支 (日柱地支) */
  dayBranch: EarthlyBranch
  /** 日主五行（仅当传入 dayMasterStem 时有值） */
  dayMasterElement?: WuXing
  /** 日主与当日元素关系 */
  elementRelation?: ElementRelation
  /** 吉色 */
  luckyColor: string
  /** 吉方 */
  luckyDirection: string
  /** 今日宜 */
  dos: string[]
  /** 今日忌 */
  donts: string[]
  /** 综合吉凶指数 1-5，5 最吉 */
  overallRating: 1 | 2 | 3 | 4 | 5
  /** 建除十二神 (建除满平定执破危成收开闭) */
  dayOfficer: DayOfficer
  /** 二十八宿值日 */
  mansion: TwentyEightMansion
  /** 建除-based 宜 (base 宜忌, canonical) */
  goodFor: string[]
  /** 建除-based 忌 */
  avoid: string[]
  /** 当日所冲生肖 (六冲) */
  clash: DayClash
  /** 三煞方位 */
  evilDirection: string
  /** 黄道黑道值神 (黄道吉 / 黑道凶) */
  dayGod: DayGod
  /** 彭祖百忌 (按日柱干支) */
  pengZu: PengZuTaboo
}

// ── 主函数 ────────────────────────────────────────────────────

/**
 * 计算当日日历通书
 *
 * @param dateInput 公历日期 { year, month, day }
 * @param dayMasterStem 日主天干（来自用户四柱日柱天干），可选
 */
export function calculateDailyAlmanac(
  dateInput: { year: number; month: number; day: number },
  dayMasterStem?: HeavenlyStem
): DailyAlmanac {
  const pillars = getFourPillars({ ...dateInput, hour: 0 })
  const todayGanZhi = pillars.day.label
  const todayElement = STEM_WUXING[pillars.day.stem]
  const dayBranch = pillars.day.branch

  // 建除 depends on the 节-based 月建 (NOT the Gregorian month). getMonthByJie
  // returns 0=寅, so map back to an EarthlyBranch via the +2 寅-offset.
  const monthBranchIdx = getMonthByJie(dateInput.year, dateInput.month, dateInput.day)
  const monthBranch = EARTHLY_BRANCHES[(monthBranchIdx + 2) % 12]!
  const officer = jianChu(monthBranch, dayBranch)
  const yiji = OFFICER_YIJI[officer]
  const { clash, evilDirection } = dayClash(dayBranch)
  const dayGod = huangHeiDao(monthBranch, dayBranch)
  const pengZu = pengZuTaboo(pillars.day.stem, dayBranch)

  let dayMasterElement: WuXing | undefined
  let elementRelation: ElementRelation | undefined
  let overallRating: 1 | 2 | 3 | 4 | 5

  if (dayMasterStem) {
    dayMasterElement = STEM_WUXING[dayMasterStem]
    elementRelation = elementRelationOf(todayElement, dayMasterElement)
    overallRating = RELATION_RATING[elementRelation]
  } else {
    overallRating = DEFAULT_RATING[todayElement]
  }

  // Lucky element: element that generates dayMaster, or today's element if no personal chart
  const luckyElement: WuXing = dayMasterElement ? WUXING_MOTHER[dayMasterElement] : todayElement

  return {
    todayGanZhi,
    todayElement,
    dayBranch,
    dayMasterElement,
    elementRelation,
    luckyColor: ELEMENT_COLOR[luckyElement],
    luckyDirection: ELEMENT_DIRECTION[luckyElement],
    dos: ELEMENT_DOS[todayElement],
    donts: ELEMENT_DONTS[todayElement],
    overallRating,
    dayOfficer: officer,
    mansion: twentyEightMansions(dateInput),
    goodFor: [...yiji.good],
    avoid: [...yiji.bad],
    clash,
    evilDirection,
    dayGod,
    pengZu,
  }
}

// ── 对你而言 — deterministic personal overlay (C.3, non-LLM) ──

/** 对你而言 personal fit verdict for a day. */
export type PersonalFit = '吉' | '平' | '凶'

/**
 * Structured reason codes — the engine stays locale-free; the app/push localizes
 * these (so the deterministic overlay works in all 4 locales without baked CJK).
 */
export type PersonalReasonCode =
  | 'day_generates_self' // 生我 — the day feeds the 日主
  | 'day_controls_self' // 克我 — the day restrains the 日主
  | 'self_generates_day' // 我生 — the 日主 is drained
  | 'self_controls_day' // 我克 — the 日主 dominates (controllable)
  | 'day_same_as_self' // 同类 — 比助
  | 'favorable_element_present' // today's 五行 == 用神
  | 'unfavorable_element_present' // today's 五行 == 忌神
  | 'personal_clash' // the day's 地支 冲 the user's 本命支

export interface PersonalAlmanacSubject {
  /** 日主天干 (from the user's birth day-pillar) — the only required field. */
  dayMasterStem: HeavenlyStem
  /** 用神五行 — optional, from a full 八字 analysis; a stronger signal than the raw relation. */
  favorableElement?: WuXing
  /** 忌神五行 — optional. */
  unfavorableElement?: WuXing
  /** 本命地支 (生肖/年支 or 日支) — for the personal 六冲 check. */
  birthBranch?: EarthlyBranch
}

export interface PersonalAlmanacOverlay {
  dayMasterElement: WuXing
  /** relation of the day's 天干五行 to the 日主 */
  relation: ElementRelation
  /** personal verdict — 用神/忌神 (when known) override the raw relation */
  fit: PersonalFit
  /** today's 五行 == 用神 (null when 用神 unknown) */
  favorsToday: boolean | null
  /** today's 五行 == 忌神 (null when unknown) */
  harmsToday: boolean | null
  /** the day clashes the user's 本命支 */
  personalClash: boolean
  /** structured reason codes, app-localized */
  reasons: PersonalReasonCode[]
}

const RELATION_REASON: Record<ElementRelation, PersonalReasonCode> = {
  生我: 'day_generates_self',
  克我: 'day_controls_self',
  我生: 'self_generates_day',
  我克: 'self_controls_day',
  同类: 'day_same_as_self',
}

/**
 * 对你而言 — the deterministic personal overlay (C.3). Pure 五行 math, **no LLM**.
 * The same function powers the on-device in-app overlay (no PII egress) and the
 * server-side daily-push line. The personalized **rating** is not duplicated here —
 * call `calculateDailyAlmanac(date, dayMasterStem).overallRating` for that.
 *
 * @param subject user静态命理特征 (日主 required; 用神/忌神/本命支 optional, raise precision)
 * @param day     the day's `{ dayElement, dayBranch }` — from `DailyAlmanac.todayElement` + `.dayBranch`
 */
export function personalAlmanacOverlay(
  subject: PersonalAlmanacSubject,
  day: { dayElement: WuXing; dayBranch: EarthlyBranch }
): PersonalAlmanacOverlay {
  const dayMasterElement = STEM_WUXING[subject.dayMasterStem]
  const relation = elementRelationOf(day.dayElement, dayMasterElement)

  const favorsToday =
    subject.favorableElement === undefined ? null : day.dayElement === subject.favorableElement
  const harmsToday =
    subject.unfavorableElement === undefined ? null : day.dayElement === subject.unfavorableElement

  const personalClash =
    subject.birthBranch !== undefined &&
    EARTHLY_BRANCHES.indexOf(day.dayBranch) ===
      (EARTHLY_BRANCHES.indexOf(subject.birthBranch) + 6) % 12

  // 用神/忌神 (when known) override the raw 日主 relation for the headline verdict.
  let fit: PersonalFit = relation === '生我' ? '吉' : relation === '克我' ? '凶' : '平'
  if (favorsToday) fit = '吉'
  if (harmsToday) fit = '凶'

  const reasons: PersonalReasonCode[] = [RELATION_REASON[relation]]
  if (favorsToday) reasons.push('favorable_element_present')
  if (harmsToday) reasons.push('unfavorable_element_present')
  if (personalClash) reasons.push('personal_clash')

  return { dayMasterElement, relation, fit, favorsToday, harmsToday, personalClash, reasons }
}
