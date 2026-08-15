/**
 * Classical glossary — 黄历行话 dictionary for the 「黄历原声」 voice mode.
 *
 * 建除十二神 / 黄黑道值神 / 十二时辰文言名, each with a classical gloss AND a
 * plain-language explanation (baihua) so the 历书 glossary is educational, not
 * just jargon. 二十八宿全表 comes from `@zhop/astro-core` `TWENTY_EIGHT_MANSIONS`.
 */

export interface OfficerEntry {
  classical: string
  baihua: string
}

export interface DayGodEntry {
  dao: string
  classical: string
  baihua: string
}

type ZhPair<T> = { 'zh-Hans': T; 'zh-Hant': T }

/** 建除十二神 — name → { classical gloss, plain-language explanation }. */
const OFFICER_GLOSS: Record<string, ZhPair<OfficerEntry>> = {
  建: {
    'zh-Hans': {
      classical: '万物建生，谋事立业之始。',
      baihua: '万物生发之日，传统上适合开始新事、定下计划。',
    },
    'zh-Hant': {
      classical: '萬物建生，謀事立業之始。',
      baihua: '萬物生發之日，傳統上適合開始新事、定下計劃。',
    },
  },
  除: {
    'zh-Hans': {
      classical: '除旧布新，宜洒扫、除服。',
      baihua: '除去旧物之日，适合打扫、理发、除旧布新。',
    },
    'zh-Hant': {
      classical: '除舊布新，宜灑掃、除服。',
      baihua: '除去舊物之日，適合打掃、理髮、除舊布新。',
    },
  },
  满: {
    'zh-Hans': {
      classical: '盈满之候，宜缓不宜满。',
      baihua: '充盈之日，传统上认为凡事不宜做到满。',
    },
    'zh-Hant': {
      classical: '盈滿之候，宜緩不宜滿。',
      baihua: '充盈之日，傳統上認為凡事不宜做到滿。',
    },
  },
  平: {
    'zh-Hans': { classical: '均平之日，诸事平稳。', baihua: '平稳之日，没有明显偏向，诸事平常。' },
    'zh-Hant': { classical: '均平之日，諸事平穩。', baihua: '平穩之日，沒有明顯偏向，諸事平常。' },
  },
  定: {
    'zh-Hans': {
      classical: '安定之时，宜安宅定盟。',
      baihua: '安定之日，传统上适合安宅、定盟、签长期约定。',
    },
    'zh-Hant': {
      classical: '安定之時，宜安宅定盟。',
      baihua: '安定之日，傳統上適合安宅、定盟、簽長期約定。',
    },
  },
  执: {
    'zh-Hans': {
      classical: '执守之义，宜修造畋猎。',
      baihua: '执守之日，传统上适合修造、围猎之类需要盯守的事。',
    },
    'zh-Hant': {
      classical: '執守之義，宜修造畋獵。',
      baihua: '執守之日，傳統上適合修造、圍獵之類需要盯守的事。',
    },
  },
  破: {
    'zh-Hans': {
      classical: '破败之象，宜破屋坏垣。',
      baihua: '破除之日，传统上适合拆旧——破屋、拆墙；大事不宜。',
    },
    'zh-Hant': {
      classical: '破敗之象，宜破屋壞垣。',
      baihua: '破除之日，傳統上適合拆舊——破屋、拆牆；大事不宜。',
    },
  },
  危: {
    'zh-Hans': {
      classical: '高危之位，宜安床，慎登高。',
      baihua: '高危之日，传统上适合安床，但不宜登高冒险。',
    },
    'zh-Hant': {
      classical: '高危之位，宜安床，慎登高。',
      baihua: '高危之日，傳統上適合安床，但不宜登高冒險。',
    },
  },
  成: {
    'zh-Hans': {
      classical: '成就之期，凡事可成。',
      baihua: '成就之日，传统上适合办大事——签约、开业、婚嫁。',
    },
    'zh-Hant': {
      classical: '成就之期，凡事可成。',
      baihua: '成就之日，傳統上適合辦大事——簽約、開業、婚嫁。',
    },
  },
  收: {
    'zh-Hans': {
      classical: '收敛之节，宜纳财收债。',
      baihua: '收成之日，传统上适合收账、收债、收纳整理。',
    },
    'zh-Hant': {
      classical: '收斂之節，宜納財收債。',
      baihua: '收成之日，傳統上適合收帳、收債、收納整理。',
    },
  },
  开: {
    'zh-Hans': {
      classical: '开张之吉，宜开业远行。',
      baihua: '开放之日，传统上适合开业、出行、开始新事务。',
    },
    'zh-Hant': {
      classical: '開張之吉，宜開業遠行。',
      baihua: '開放之日，傳統上適合開業、出行、開始新事務。',
    },
  },
  闭: {
    'zh-Hans': {
      classical: '阖闭之日，宜收敛安葬。',
      baihua: '闭合之日，传统上适合收敛、安葬之类收束的事。',
    },
    'zh-Hant': {
      classical: '闔閉之日，宜收斂安葬。',
      baihua: '閉合之日，傳統上適合收斂、安葬之類收束的事。',
    },
  },
}

/** 黄黑道十二值神 — name → { 道, classical gloss, plain-language explanation }. */
const DAY_GOD_GLOSS: Record<string, ZhPair<DayGodEntry>> = {
  青龙: {
    'zh-Hans': {
      dao: '黄道',
      classical: '青龙值日，主贵。',
      baihua: '黄道吉神，主贵气——传统历书列为吉日。',
    },
    'zh-Hant': {
      dao: '黃道',
      classical: '青龍值日，主貴。',
      baihua: '黃道吉神，主貴氣——傳統曆書列為吉日。',
    },
  },
  明堂: {
    'zh-Hans': {
      dao: '黄道',
      classical: '明堂值日，主贵。',
      baihua: '黄道吉神，主贵人——传统历书列为吉日。',
    },
    'zh-Hant': {
      dao: '黃道',
      classical: '明堂值日，主貴。',
      baihua: '黃道吉神，主貴人——傳統曆書列為吉日。',
    },
  },
  金匮: {
    'zh-Hans': {
      dao: '黄道',
      classical: '金匮值日，主财。',
      baihua: '黄道吉神，主财——传统历书列为吉日。',
    },
    'zh-Hant': {
      dao: '黃道',
      classical: '金匱值日，主財。',
      baihua: '黃道吉神，主財——傳統曆書列為吉日。',
    },
  },
  天德: {
    'zh-Hans': {
      dao: '黄道',
      classical: '天德值日，主福。',
      baihua: '黄道吉神，主福德——传统历书列为吉日。',
    },
    'zh-Hant': {
      dao: '黃道',
      classical: '天德值日，主福。',
      baihua: '黃道吉神，主福德——傳統曆書列為吉日。',
    },
  },
  玉堂: {
    'zh-Hans': {
      dao: '黄道',
      classical: '玉堂值日，主贵。',
      baihua: '黄道吉神，主贵——传统历书列为吉日。',
    },
    'zh-Hant': {
      dao: '黃道',
      classical: '玉堂值日，主貴。',
      baihua: '黃道吉神，主貴——傳統曆書列為吉日。',
    },
  },
  司命: {
    'zh-Hans': {
      dao: '黄道',
      classical: '司命值日，主寿。',
      baihua: '黄道吉神，主寿——传统历书列为吉日。',
    },
    'zh-Hant': {
      dao: '黃道',
      classical: '司命值日，主壽。',
      baihua: '黃道吉神，主壽——傳統曆書列為吉日。',
    },
  },
  天刑: {
    'zh-Hans': {
      dao: '黑道',
      classical: '天刑值日，主刑。',
      baihua: '黑道神煞，主刑伤——传统历书列为慎用之日。',
    },
    'zh-Hant': {
      dao: '黑道',
      classical: '天刑值日，主刑。',
      baihua: '黑道神煞，主刑傷——傳統曆書列為慎用之日。',
    },
  },
  朱雀: {
    'zh-Hans': {
      dao: '黑道',
      classical: '朱雀值日，主口舌。',
      baihua: '黑道神煞，主口舌是非——传统历书列为慎用之日。',
    },
    'zh-Hant': {
      dao: '黑道',
      classical: '朱雀值日，主口舌。',
      baihua: '黑道神煞，主口舌是非——傳統曆書列為慎用之日。',
    },
  },
  白虎: {
    'zh-Hans': {
      dao: '黑道',
      classical: '白虎值日，主丧。',
      baihua: '黑道神煞，主丧事——传统历书列为慎用之日。',
    },
    'zh-Hant': {
      dao: '黑道',
      classical: '白虎值日，主喪。',
      baihua: '黑道神煞，主喪事——傳統曆書列為慎用之日。',
    },
  },
  天牢: {
    'zh-Hans': {
      dao: '黑道',
      classical: '天牢值日，主囚。',
      baihua: '黑道神煞，主困囚——传统历书列为慎用之日。',
    },
    'zh-Hant': {
      dao: '黑道',
      classical: '天牢值日，主囚。',
      baihua: '黑道神煞，主困囚——傳統曆書列為慎用之日。',
    },
  },
  玄武: {
    'zh-Hans': {
      dao: '黑道',
      classical: '玄武值日，主盗。',
      baihua: '黑道神煞，主盗失——传统历书列为慎用之日。',
    },
    'zh-Hant': {
      dao: '黑道',
      classical: '玄武值日，主盜。',
      baihua: '黑道神煞，主盜失——傳統曆書列為慎用之日。',
    },
  },
  勾陈: {
    'zh-Hans': {
      dao: '黑道',
      classical: '勾陈值日，主田土。',
      baihua: '黑道神煞，主田土纠纷——传统历书列为慎用之日。',
    },
    'zh-Hant': {
      dao: '黑道',
      classical: '勾陳值日，主田土。',
      baihua: '黑道神煞，主田土糾紛——傳統曆書列為慎用之日。',
    },
  },
}

/** 十二时辰文言名 (子=夜半 … 亥=人定) — classical register. */
const SHICHEN_CLASSICAL: ReadonlyArray<{ 'zh-Hans': string; 'zh-Hant': string }> = [
  { 'zh-Hans': '夜半', 'zh-Hant': '夜半' },
  { 'zh-Hans': '鸡鸣', 'zh-Hant': '雞鳴' },
  { 'zh-Hans': '平旦', 'zh-Hant': '平旦' },
  { 'zh-Hans': '日出', 'zh-Hant': '日出' },
  { 'zh-Hans': '食时', 'zh-Hant': '食時' },
  { 'zh-Hans': '隅中', 'zh-Hant': '隅中' },
  { 'zh-Hans': '日中', 'zh-Hant': '日中' },
  { 'zh-Hans': '日昳', 'zh-Hant': '日昳' },
  { 'zh-Hans': '晡时', 'zh-Hant': '晡時' },
  { 'zh-Hans': '日入', 'zh-Hant': '日入' },
  { 'zh-Hans': '黄昏', 'zh-Hant': '黃昏' },
  { 'zh-Hans': '人定', 'zh-Hant': '人定' },
]

function pick<T>(v: ZhPair<T>, locale: string): T {
  return v[locale === 'zh-Hant' ? 'zh-Hant' : 'zh-Hans']
}

/** 建除 entry (classical + baihua) — null for unknown officers. */
export function officerEntry(officer: string, locale: string): OfficerEntry | null {
  const g = OFFICER_GLOSS[officer]
  return g ? pick(g, locale) : null
}

/** 建除 one-line classical gloss (voice-mode surfaces). */
export function officerGloss(officer: string, locale: string): string | null {
  return officerEntry(officer, locale)?.classical ?? null
}

/** 值神 entry (黄道/黑道 + glosses) — null for unknown gods. */
export function dayGodEntry(name: string, locale: string): DayGodEntry | null {
  const g = DAY_GOD_GLOSS[name]
  return g ? pick(g, locale) : null
}

/** 时辰文言名 by 0-11 index (子..亥). */
export function shichenClassicalName(index: number, locale: string): string {
  const v = SHICHEN_CLASSICAL[index]
  return v ? pick(v, locale) : ''
}

/** 彭祖百忌 plain-language intro (glossary only). */
export function pengzuIntro(locale: string): string {
  return locale === 'zh-Hant'
    ? '彭祖百忌是依干支日的傳統口訣，以「某日不宜某事」的句式流傳——如「庚不經絡」指庚日不宜織布絡經。歷書沿用作文化參考，非科學主張。'
    : '彭祖百忌是依干支日的传统口诀，以「某日不宜某事」的句式流传——如「庚不经络」指庚日不宜织布络经。历书沿用作文化参考，非科学主张。'
}

/** 纳音 plain-language intro (glossary only). */
export function nayinIntro(locale: string): string {
  return locale === 'zh-Hant'
    ? '六十甲子各有納音五行之名，如「壁上土」「劍鋒金」——以日常物象比喻該干支的五行氣質，是干支的傳統分類法。'
    : '六十甲子各有纳音五行之名，如「壁上土」「剑锋金」——以日常物象比喻该干支的五行气质，是干支的传统分类法。'
}
