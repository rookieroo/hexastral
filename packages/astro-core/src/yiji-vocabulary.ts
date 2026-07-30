/**
 * Shared 宜忌 vocabulary — display labels + reverse-择日 aliases.
 *
 * Canonical terms stay zh-Hans CJK (from OFFICER_YIJI). Scoring, explain fields,
 * and API arrays always use those strings. UI / push / widget format through
 * `formatYijiVerb` with a locale + display mode.
 */

import { OFFICER_YIJI } from './almanac'

export type YijiVocabularyMode = 'modern' | 'traditional'

export type YijiLocale = 'zh-Hans' | 'zh-Hant' | 'ja' | 'en'

/** Unique verbs currently emitted by OFFICER_YIJI (forced coverage set). */
export function officerYijiCanonicalTerms(): readonly string[] {
  const set = new Set<string>()
  for (const row of Object.values(OFFICER_YIJI)) {
    for (const v of row.good) set.add(v)
    for (const v of row.bad) set.add(v)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-Hans'))
}

/** Locale-aware default when the user has no explicit override. */
export function defaultYijiModeForLocale(locale: string): YijiVocabularyMode {
  const t = locale.trim().toLowerCase()
  if (t.startsWith('en')) return 'modern'
  return 'traditional'
}

type LabelTable = Record<string, string>

/** Traditional display (通书 / locale gloss). zh-Hans is pass-through. */
const TRADITIONAL: Record<YijiLocale, LabelTable> = {
  'zh-Hans': {},
  'zh-Hant': {
    嫁娶: '嫁娶',
    出行: '出行',
    入宅: '入宅',
    移徙: '移徙',
    开市: '開市',
    交易: '交易',
    立券: '立券',
    求医: '求醫',
    求嗣: '求嗣',
    求财: '求財',
    祈福: '祈福',
    祭祀: '祭祀',
    沐浴: '沐浴',
    理发: '理髮',
    修造: '修造',
    动土: '動土',
    破土: '破土',
    安葬: '安葬',
    上梁: '上樑',
    入殓: '入殮',
    进人口: '進人口',
    经络: '經絡',
    牧养: '牧養',
    纳畜: '納畜',
    捕捉: '捕捉',
    畋猎: '畋獵',
    取鱼: '取魚',
    栽种: '栽種',
    解除: '解除',
    安香: '安香',
    平治道涂: '平治道塗',
    修饰垣墙: '修飾垣牆',
    谢土: '謝土',
    开光: '開光',
    安床: '安床',
    治病: '治病',
    入学: '入學',
    雕刻: '雕刻',
    纳财: '納財',
    斋醮: '齋醮',
    见贵: '見貴',
    除服: '除服',
    疗病: '療病',
    涂泥: '塗泥',
    诉讼: '訴訟',
    破屋: '破屋',
    拆卸: '拆卸',
    登高: '登高',
    行船: '行船',
    入仓: '入倉',
    补垣: '補垣',
    塞穴: '塞穴',
    筑堤: '築堤',
  },
  ja: {
    嫁娶: '婚姻',
    出行: '外出',
    入宅: '入居',
    移徙: '移転',
    开市: '開店',
    交易: '取引',
    立券: '契約',
    求医: '受診',
    求嗣: '子授け',
    求财: '金運',
    祈福: '祈祷',
    祭祀: '祭祀',
    沐浴: '入浴',
    理发: '理髪',
    修造: '修繕',
    动土: '起工',
    破土: '破土',
    安葬: '葬儀',
    上梁: '棟上げ',
    入殓: '納棺',
    进人口: '入家',
    经络: '針灸',
    牧养: '牧畜',
    纳畜: '畜入',
    捕捉: '捕獲',
    畋猎: '狩猟',
    取鱼: '漁',
    栽种: '植栽',
    解除: '解除',
    安香: '香炉',
    平治道涂: '道普請',
    修饰垣墙: '塀補修',
    谢土: '土地神祭',
    开光: '開眼',
    安床: '床入れ',
    治病: '治療',
    入学: '入学',
    雕刻: '彫刻',
    纳财: '財収',
    斋醮: '斎戒',
    见贵: '貴人',
    除服: '喪明け',
    疗病: '治療',
    涂泥: '左官',
    诉讼: '訴訟',
    破屋: '解体',
    拆卸: '撤去',
    登高: '登山',
    行船: '乗船',
    入仓: '入庫',
    补垣: '塀補',
    塞穴: '穴塞ぎ',
    筑堤: '築堤',
  },
  en: {
    嫁娶: 'Wedding',
    出行: 'Travel',
    入宅: 'Move in',
    移徙: 'Relocate',
    开市: 'Open',
    交易: 'Trade',
    立券: 'Sign',
    求医: 'Doctor',
    求嗣: 'Heir',
    求财: 'Wealth',
    祈福: 'Bless',
    祭祀: 'Rite',
    沐浴: 'Bath',
    理发: 'Haircut',
    修造: 'Build',
    动土: 'Dig',
    破土: 'Grave',
    安葬: 'Burial',
    上梁: 'Beam',
    入殓: 'Encoffin',
    进人口: 'Family',
    经络: 'Acupunct',
    牧养: 'Herd',
    纳畜: 'Livestock',
    捕捉: 'Catch',
    畋猎: 'Hunt',
    取鱼: 'Fish',
    栽种: 'Plant',
    解除: 'Clear',
    安香: 'Incense',
    平治道涂: 'Road',
    修饰垣墙: 'Wall',
    谢土: 'Earth',
    开光: 'Idol',
    安床: 'Bed',
    治病: 'Heal',
    入学: 'School',
    雕刻: 'Carve',
    纳财: 'Income',
    斋醮: 'Fast',
    见贵: 'Patron',
    除服: 'Mourn end',
    疗病: 'Heal',
    涂泥: 'Plaster',
    诉讼: 'Lawsuit',
    破屋: 'Raze',
    拆卸: 'Dismantle',
    登高: 'Climb',
    行船: 'Sail',
    入仓: 'Store',
    补垣: 'Mend',
    塞穴: 'Seal',
    筑堤: 'Dike',
  },
}

/**
 * Modern scene labels (≤3 CJK chars preferred). Semantic equivalents only —
 * does not invent new auspiciousness.
 */
const MODERN: Record<YijiLocale, LabelTable> = {
  'zh-Hans': {
    嫁娶: '结婚',
    见贵: '会面',
    开市: '开业',
    立券: '签约',
    移徙: '搬家',
    入宅: '入住',
    求医: '就医',
    疗病: '治疗',
    治病: '治疗',
    修造: '装修',
    动土: '开工',
    纳财: '收款',
    入仓: '入库',
    破屋: '拆除',
    补垣: '补墙',
    塞穴: '封堵',
    栽种: '种植',
    诉讼: '诉讼',
    入学: '入学',
    求财: '求财',
    破土: '破土',
    出行: '出行',
    交易: '交易',
    祈福: '祈福',
    祭祀: '祭祀',
    沐浴: '沐浴',
    安床: '安床',
    安葬: '安葬',
    捕捉: '捕捉',
    纳畜: '纳畜',
    涂泥: '涂泥',
    除服: '除服',
    登高: '登高',
    行船: '行船',
    拆卸: '拆卸',
    筑堤: '筑堤',
  },
  'zh-Hant': {
    嫁娶: '結婚',
    见贵: '會面',
    开市: '開業',
    立券: '簽約',
    移徙: '搬家',
    入宅: '入住',
    求医: '就醫',
    疗病: '治療',
    治病: '治療',
    修造: '裝修',
    动土: '開工',
    纳财: '收款',
    入仓: '入庫',
    破屋: '拆除',
    补垣: '補牆',
    塞穴: '封堵',
    栽种: '種植',
    诉讼: '訴訟',
    入学: '入學',
    求财: '求財',
    破土: '破土',
    出行: '出行',
    交易: '交易',
    祈福: '祈福',
    祭祀: '祭祀',
    沐浴: '沐浴',
    安床: '安床',
    安葬: '安葬',
    捕捉: '捕捉',
    纳畜: '納畜',
    涂泥: '塗泥',
    除服: '除服',
    登高: '登高',
    行船: '行船',
    拆卸: '拆卸',
    筑堤: '築堤',
  },
  ja: {
    嫁娶: '結婚',
    见贵: '面会',
    开市: '開店',
    立券: '契約',
    移徙: '引越',
    入宅: '入居',
    求医: '受診',
    疗病: '治療',
    治病: '治療',
    修造: '修繕',
    动土: '起工',
    纳财: '入金',
    入仓: '入庫',
    破屋: '解体',
    补垣: '塀補',
    塞穴: '封堵',
    栽种: '植栽',
    诉讼: '訴訟',
    入学: '入学',
    求财: '金運',
    破土: '破土',
    出行: '外出',
    交易: '取引',
    祈福: '祈祷',
    祭祀: '祭祀',
    沐浴: '入浴',
    安床: '床入',
    安葬: '葬儀',
    捕捉: '捕獲',
    纳畜: '畜入',
    涂泥: '左官',
    除服: '喪明',
    登高: '登山',
    行船: '乗船',
    拆卸: '撤去',
    筑堤: '築堤',
  },
  en: {
    嫁娶: 'Wedding',
    见贵: 'Meet',
    开市: 'Launch',
    立券: 'Sign',
    移徙: 'Move',
    入宅: 'Move in',
    求医: 'Clinic',
    疗病: 'Heal',
    治病: 'Heal',
    修造: 'Renovate',
    动土: 'Start',
    纳财: 'Collect',
    入仓: 'Store',
    破屋: 'Raze',
    补垣: 'Mend',
    塞穴: 'Seal',
    栽种: 'Plant',
    诉讼: 'Lawsuit',
    入学: 'School',
    求财: 'Wealth',
    破土: 'Grave',
    出行: 'Travel',
    交易: 'Trade',
    祈福: 'Bless',
    祭祀: 'Rite',
    沐浴: 'Bath',
    安床: 'Bed',
    安葬: 'Burial',
    捕捉: 'Catch',
    纳畜: 'Livestock',
    涂泥: 'Plaster',
    除服: 'Mourn end',
    登高: 'Climb',
    行船: 'Sail',
    拆卸: 'Dismantle',
    筑堤: 'Dike',
  },
}

function normalizeLocale(locale: string): YijiLocale {
  const t = locale.trim().toLowerCase()
  if (t.startsWith('en')) return 'en'
  if (t.startsWith('ja')) return 'ja'
  if (t.includes('hant') || t.includes('tw') || t.includes('hk')) return 'zh-Hant'
  if (t.startsWith('zh')) return 'zh-Hans'
  return 'en'
}

/**
 * Format one canonical verb for display. Unknown verbs fall back to the source
 * CJK string (graceful — production must still cover OFFICER_YIJI fully).
 */
export function formatYijiVerb(
  verb: string,
  locale: string,
  mode: YijiVocabularyMode = 'traditional'
): string {
  const loc = normalizeLocale(locale)
  if (mode === 'modern') {
    const modern = MODERN[loc][verb]
    if (modern) return modern
  }
  if (loc === 'zh-Hans') return verb
  return TRADITIONAL[loc][verb] ?? verb
}

/**
 * Format a list: map → stable dedupe (preserve first occurrence) → optional cap.
 * Join separators: CJK `·`, en/ja ` · `.
 */
export function formatYijiList(
  verbs: readonly string[],
  locale: string,
  mode: YijiVocabularyMode = 'traditional',
  max?: number
): string {
  const loc = normalizeLocale(locale)
  const sep = loc === 'zh-Hans' || loc === 'zh-Hant' ? '·' : ' · '
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of verbs) {
    const label = formatYijiVerb(v, loc, mode)
    if (seen.has(label)) continue
    seen.add(label)
    out.push(label)
    if (max != null && out.length >= max) break
  }
  return out.length > 0 ? out.join(sep) : '—'
}

/** Stable reverse-择日 event ids (API contract). */
export const YIJI_EVENTS = [
  'wedding',
  'business',
  'signing',
  'move',
  'move-in',
  'travel',
  'burial',
  'groundbreaking',
  'medical',
  'study',
] as const

export type YijiEvent = (typeof YIJI_EVENTS)[number]

/** event → canonical verbs for scoring (exact match against goodFor/avoid). */
export const YIJI_EVENT_VERBS: Record<YijiEvent, readonly string[]> = {
  wedding: ['嫁娶'],
  business: ['开市', '交易', '纳财'],
  signing: ['立券', '交易'],
  move: ['移徙'],
  'move-in': ['入宅', '移徙'],
  travel: ['出行'],
  burial: ['安葬'],
  groundbreaking: ['动土', '破土'],
  medical: ['求医', '疗病'],
  study: ['入学'],
}

/**
 * Modern / hot-word aliases → event id or canonical verb list.
 * Aliases never invent OFFICER_YIJI rows — they only expand search entry points.
 */
export const YIJI_SEARCH_ALIASES: Record<string, YijiEvent | readonly string[]> = {
  // Locale-neutral keys (UI may localize the chip label)
  相亲: 'wedding',
  读书: 'study',
  进修: 'study',
  面试: ['见贵', '求财'],
  体检: 'medical',
  发布: 'business',
  上线: 'business',
  谈判: 'signing',
  AI: ['入学', '求财'],
  游戏: ['祈福', '沐浴'],
  // English aliases
  dating: 'wedding',
  reading: 'study',
  study: 'study',
  interview: ['见贵', '求财'],
  checkup: 'medical',
  launch: 'business',
  negotiate: 'signing',
  gaming: ['祈福', '沐浴'],
}

export function resolveYijiSearchVerbs(
  eventOrAlias: string
): { event?: YijiEvent; verbs: readonly string[] } | null {
  if ((YIJI_EVENTS as readonly string[]).includes(eventOrAlias)) {
    const event = eventOrAlias as YijiEvent
    return { event, verbs: YIJI_EVENT_VERBS[event] }
  }
  const mapped = YIJI_SEARCH_ALIASES[eventOrAlias]
  if (!mapped) return null
  if (typeof mapped === 'string') {
    return { event: mapped, verbs: YIJI_EVENT_VERBS[mapped] }
  }
  return { verbs: mapped }
}

/** Explain / analytics field — always canonical CJK, never localized chrome. */
export function yijiExplainField(side: 'good' | 'avoid', canonical: string): string {
  return `${side === 'good' ? '宜' : '忌'} ${canonical}`
}
