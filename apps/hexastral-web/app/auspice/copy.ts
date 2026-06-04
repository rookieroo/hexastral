/**
 * Copy + locale resolution for the Auspice marketing landing (`/auspice`).
 *
 * `/auspice` sits OUTSIDE the next-intl `[locale]` tree (same as `/s/*`) because
 * it is the destination the share OG cards advertise as `hexastral.com/auspice`
 * — a stable, prefix-free URL. So it self-localizes: an explicit `?lang=` wins,
 * otherwise we sniff `Accept-Language`, otherwise `en`.
 *
 * Locale keys follow the share-token convention (`zh-Hans` | `zh-Hant` | `ja` |
 * `en`) so the landing reads identically to the card that linked to it.
 */

export type AuspiceLocale = 'zh-Hans' | 'zh-Hant' | 'ja' | 'en'

export interface Feature {
  title: string
  body: string
}

export interface LandingCopy {
  eyebrow: string
  hero: string
  sub: string
  intro: string
  features: [Feature, Feature, Feature]
  cta: string
  ctaNote: string
  footer: string
}

const EN: LandingCopy = {
  eyebrow: 'AUSPICE',
  hero: 'The Chinese calendar, for the world.',
  sub: 'Daily 干支 · lunar date · 节气 · 宜忌 — and a reading that knows your chart.',
  intro:
    'Auspice turns the classical almanac (黄历) into something you actually open: every day’s 干支, lunar date, solar term, and what it favors or warns against — then makes it personal with your own bāzì.',
  features: [
    {
      title: 'Daily almanac',
      body: 'Each day’s 干支 · 农历 · 节气 · 宜忌, plus a deep reading on why today favors what it favors.',
    },
    {
      title: 'Life timeline',
      body: 'Your life as a branching timeline — 大运 · 流年 · 流月 — so you can see this cycle in context, not just today.',
    },
    {
      title: 'Make if',
      body: 'Explore a parallel life drawn from your bāzì: pick a fork and read how the branch plays out.',
    },
  ],
  cta: 'Get Auspice on iOS',
  ctaNote: 'Free to start. The almanac is yours; the personal readings unlock with your chart.',
  footer: 'Auspice — daily 干支 · 农历 · 节气 · 宜忌',
}

export const COPY: Record<AuspiceLocale, LandingCopy> = {
  en: EN,
  'zh-Hans': {
    eyebrow: 'AUSPICE 黄历',
    hero: '一部，给世界的中华黄历。',
    sub: '每日干支 · 农历 · 节气 · 宜忌 —— 还有一份懂你命盘的解读。',
    intro:
      'Auspice 把古老的黄历，变成你每天真的会打开的东西：当日的干支、农历、节气，以及宜什么、忌什么——再用你自己的八字，把它变成只属于你的那一份。',
    features: [
      {
        title: '每日黄历',
        body: '当日干支 · 农历 · 节气 · 宜忌，并附深度解读——今天为什么宜这个、忌那个。',
      },
      {
        title: '人生时间线',
        body: '把一生看成一条分叉的时间线——大运 · 流年 · 流月——在脉络里看当下，而不只是看今天。',
      },
      {
        title: '假如人生',
        body: '从你的八字推演一条平行的人生：选一个分叉，读读那条支线如何展开。',
      },
    ],
    cta: 'iOS 下载 Auspice',
    ctaNote: '免费起步。黄历本就属于你；个人化解读，随你的命盘解锁。',
    footer: 'Auspice · 每日干支 · 农历 · 节气 · 宜忌',
  },
  'zh-Hant': {
    eyebrow: 'AUSPICE 黃曆',
    hero: '一部，給世界的中華黃曆。',
    sub: '每日干支 · 農曆 · 節氣 · 宜忌 —— 還有一份懂你命盤的解讀。',
    intro:
      'Auspice 把古老的黃曆，變成你每天真的會打開的東西：當日的干支、農曆、節氣，以及宜什麼、忌什麼——再用你自己的八字，把它變成只屬於你的那一份。',
    features: [
      {
        title: '每日黃曆',
        body: '當日干支 · 農曆 · 節氣 · 宜忌，並附深度解讀——今天為什麼宜這個、忌那個。',
      },
      {
        title: '人生時間線',
        body: '把一生看成一條分叉的時間線——大運 · 流年 · 流月——在脈絡裡看當下，而不只是看今天。',
      },
      {
        title: '假如人生',
        body: '從你的八字推演一條平行的人生：選一個分叉，讀讀那條支線如何展開。',
      },
    ],
    cta: 'iOS 下載 Auspice',
    ctaNote: '免費起步。黃曆本就屬於你；個人化解讀，隨你的命盤解鎖。',
    footer: 'Auspice · 每日干支 · 農曆 · 節氣 · 宜忌',
  },
  ja: {
    eyebrow: 'AUSPICE 黄暦',
    hero: '世界へひらく、中華の暦。',
    sub: '干支 · 旧暦 · 二十四節気 · 宜忌 —— そして、あなたの命盤を知る解説を。',
    intro:
      'Auspice は古来の黄暦を、毎日ひらきたくなるものに変えます。その日の干支・旧暦・節気、そして何が吉で何が凶か——さらにあなた自身の八字で、あなただけの一枚に。',
    features: [
      {
        title: '毎日の暦',
        body: 'その日の干支 · 旧暦 · 二十四節気 · 宜忌、そして「今日なぜそれが吉でそれが凶なのか」の詳しい解説。',
      },
      {
        title: '人生タイムライン',
        body: '人生を枝分かれする時間軸として——大運 · 流年 · 流月——今日だけでなく、流れの中で今を見る。',
      },
      {
        title: '假如（もしも）',
        body: '八字から導く、もう一つの人生。分岐を選び、その枝がどう展開するかを読む。',
      },
    ],
    cta: 'iOS で Auspice を入手',
    ctaNote: '無料ではじめられます。暦はあなたのもの。個人向けの解説は、あなたの命盤で解放されます。',
    footer: 'Auspice · 干支 · 旧暦 · 二十四節気 · 宜忌',
  },
}

/** Resolve a share-token locale from an explicit `?lang=` then `Accept-Language`. */
export function resolveLocale(
  lang: string | undefined,
  acceptLanguage: string | null
): AuspiceLocale {
  const explicit = normalize(lang)
  if (explicit) return explicit
  // Cheap Accept-Language sniff: first matching tag wins.
  const header = (acceptLanguage ?? '').toLowerCase()
  if (header.includes('zh-tw') || header.includes('zh-hant') || header.includes('zh-hk'))
    return 'zh-Hant'
  if (header.includes('zh')) return 'zh-Hans'
  if (header.includes('ja')) return 'ja'
  return 'en'
}

/** Map loose locale aliases (incl. the web `zh`/`tw` codes) to a token locale. */
function normalize(lang: string | undefined): AuspiceLocale | null {
  if (!lang) return null
  const l = lang.toLowerCase()
  if (l === 'zh-hant' || l === 'tw' || l === 'zh-tw' || l === 'zh-hk') return 'zh-Hant'
  if (l === 'zh-hans' || l === 'zh' || l === 'zh-cn') return 'zh-Hans'
  if (l === 'ja' || l === 'ja-jp') return 'ja'
  if (l === 'en' || l.startsWith('en-')) return 'en'
  return null
}
