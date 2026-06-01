/**
 * Six culture categories — intros (4 locales) + Wikipedia article titles.
 */

import type { CultureCategoryKey, CultureCategoryMaterial, LocalizedText } from './types'

const CATEGORY_WIKI: Record<CultureCategoryKey, LocalizedText> = {
  jieqi: {
    'zh-Hans': '二十四节气',
    'zh-Hant': '二十四節氣',
    ja: '二十四節気',
    en: 'Solar_term',
  },
  festivals: {
    'zh-Hans': '中国传统节日',
    'zh-Hant': '中國傳統節日',
    ja: '中国の節日',
    en: 'Public_holidays_in_China',
  },
  shichen: {
    'zh-Hans': '时辰 (中医)',
    'zh-Hant': '時辰 (中醫)',
    ja: '時辰',
    en: 'Earthly_Branches',
  },
  ganzhi: {
    'zh-Hans': '天干地支',
    'zh-Hant': '天干地支',
    ja: '干支',
    en: 'Sexagenary_cycle',
  },
  sizhu: {
    'zh-Hans': '八字',
    'zh-Hant': '八字',
    ja: '四柱推命',
    en: 'Four_Pillars_of_Destiny',
  },
  ziwei: {
    'zh-Hans': '紫微斗数',
    'zh-Hant': '紫微斗數',
    ja: '紫微斗数',
    en: 'Zi_wei_dou_shu',
  },
}

const INTROS: Record<CultureCategoryKey, LocalizedText> = {
  jieqi: {
    'zh-Hans':
      '二十四节气依太阳在黄道上的位置划分，每 15° 为一节气，指导农事、养生与起居节律。2016 年列入联合国教科文组织人类非物质文化遗产代表作名录。',
    'zh-Hant':
      '二十四節氣依太陽在黃道上的位置劃分，每 15° 為一節氣，指導農事、養生與起居節律。2016 年列入聯合國教科文組織人類非物質文化遺產代表作名錄。',
    ja: '二十四節気は太陽の黄道上の位置を 15 度ごとに区切った暦法で、農事・養生・暮らしのリズムを示す。2016 年にユネスコ無形文化遺産に登録された。',
    en: 'The 24 solar terms mark the sun’s ecliptic position in 15° steps — guiding farming, wellness, and daily rhythm. Listed as UNESCO Intangible Cultural Heritage in 2016.',
  },
  festivals: {
    'zh-Hans':
      '传统节日多依农历或节气而定，承载祭祀、团圆、时令食俗与历史记忆，是华人岁时文化的重要载体。下方可浏览当年八大节日的公历日期与简介。',
    'zh-Hant':
      '傳統節日多依農曆或節氣而定，承載祭祀、團圓、時令食俗與歷史記憶，是華人歲時文化的重要載體。下方可瀏覽當年八大節日的公曆日期與簡介。',
    ja: '伝統的な節句は旧暦や節気に基づき、祭祀・団欒・季節の食と歴史の記憶を担う。下の一覧から当年の八大節日をたどれる。',
    en: 'Traditional festivals follow the lunar calendar or solar terms — carrying ritual, reunion, seasonal foodways, and memory. Browse the eight major festivals for this year below.',
  },
  shichen: {
    'zh-Hans':
      '古人将一昼夜分为十二时辰，每时辰约两小时，以地支命名，并与十二经络的气血流注相对应，是中医养生与择时的基础。',
    'zh-Hant':
      '古人將一晝夜分為十二時辰，每時辰約兩小時，以地支命名，並與十二經絡的氣血流注相對應，是中醫養生與擇時的基礎。',
    ja: '一昼夜を十二の時辰（各約二時間）に分け、地支と十二経絡の気血の流れに対応させる。中医の養生と時刻選びの基礎である。',
    en: 'The day was divided into twelve 2-hour 时辰, each named by an earthly branch and tied to meridian energy-flow — the basis of traditional wellness timing.',
  },
  ganzhi: {
    'zh-Hans':
      '十天干与十二地支两两相配，六十年一轮回，称六十甲子，用于纪年、纪日、纪时，也是四柱八字与紫微排盘的基本符号。',
    'zh-Hant':
      '十天干與十二地支兩兩相配，六十年一輪回，稱六十甲子，用於紀年、紀日、紀時，也是四柱八字與紫微排盤的基本符號。',
    ja: '十干と十二支を組み合わせた六十干支は、紀年・紀日・時刻の基本記号であり、四柱推命や紫微斗数の土台となる。',
    en: 'Ten heavenly stems pair with twelve branches in a 60-year 甲子 cycle — the notation behind the calendar, Four Pillars, and Zǐwēi charts.',
  },
  sizhu: {
    'zh-Hans':
      '四柱八字以出生年、月、日、时的天干地支共八个字，结合五行生克与十神关系，推演先天格局与运势倾向，是中式命理的核心体系之一。',
    'zh-Hant':
      '四柱八字以出生年、月、日、時的天干地支共八個字，結合五行生剋與十神關係，推演先天格局與運勢傾向，是中式命理的核心體系之一。',
    ja: '四柱推命は生年月日時の干支八字から五行の生剋を読み、先天の傾向を推し量る中国命理の中核である。',
    en: 'Four Pillars (Bazi) use eight stem-branch characters from birth year, month, day, and hour — read through Five-Element interactions as a core Chinese fate system.',
  },
  ziwei: {
    'zh-Hans':
      '紫微斗数以紫微星为帝星，将百余颗星曜排布于十二宫，结合四化与流年，推演性格、际遇与运势走势，与八字并列为华人社会常见的命理体系。',
    'zh-Hant':
      '紫微斗數以紫微星為帝星，將百餘顆星曜排布於十二宮，結合四化與流年，推演性格、際遇與運勢走勢，與八字並列為華人社會常見的命理體系。',
    ja: '紫微斗数は紫微星を中心に百余の星を十二宮へ配し、四化と流年で性格・運勢を読む。四柱推命と並ぶ命理体系である。',
    en: 'Zǐwēi Dǒushù places 100+ stars across twelve palaces, led by the emperor star Zǐwěi — charting temperament and fortune alongside Bazi in Chinese divination.',
  },
}

const ORDER: ReadonlyArray<CultureCategoryKey> = [
  'festivals',
  'jieqi',
  'shichen',
  'ganzhi',
  'sizhu',
  'ziwei',
]

export const CULTURE_CATEGORIES: ReadonlyArray<CultureCategoryMaterial> = ORDER.map((key) => ({
  key,
  intro: INTROS[key],
  wikipediaTitle: CATEGORY_WIKI[key],
}))

export function getCultureCategory(key: CultureCategoryKey): CultureCategoryMaterial {
  const found = CULTURE_CATEGORIES.find((c) => c.key === key)
  if (!found) throw new Error(`Unknown culture category: ${key}`)
  return found
}

export function isCultureCategoryKey(value: string): value is CultureCategoryKey {
  return (
    value === 'festivals' ||
    value === 'jieqi' ||
    value === 'shichen' ||
    value === 'ganzhi' ||
    value === 'sizhu' ||
    value === 'ziwei'
  )
}
