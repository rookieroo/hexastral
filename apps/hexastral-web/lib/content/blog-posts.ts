import type { GrowthAppStoreTarget } from '@/lib/growth/app-store-urls'

export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string
  appCta: GrowthAppStoreTarget
  body: string
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'what-is-zi-wei-dou-shu',
    title: 'What is Zi Wei Dou Shu (紫微斗数)? The Twelve-Palace Frame',
    description:
      'Twelve palaces, star combinations, and decade cycles — a structural reading of one moment of time.',
    date: '2026-05-08',
    appCta: 'starpalace',
    body: `Zi Wei Dou Shu (紫微斗数, "Purple Star Pattern Study") plots twelve life palaces from birth data — a structural cousin to Western house-based chart systems.

Each palace (宫 gōng) names a life domain: self, partnership, career, wealth, and more. Major and minor stars land in palaces under classical rules; combinations are read as tendencies, not verdicts.

HexAstral presents this as **StarPalace** on iOS: daily-style palace insights, decade timelines (大运 dà yùn), and AI copy that keeps **source terms** visible for trust and authenticity.

This article is for cultural orientation only — not a prediction service.`,
  },
  {
    slug: 'ba-zi-vs-mbti',
    title: 'Ba Zi (八字) vs MBTI: Same Job, Different Clock',
    description:
      'Four Pillars encode Element balance and Day Master archetype — useful for self-modeling if you treat it as a mirror, not a cage.',
    date: '2026-05-08',
    appCta: 'eightpillars',
    body: `MBTI sorts cognitive style. Ba Zi (八字, "Eight Characters" / Four Pillars) sorts the **Five Elements (五行 wǔ xíng)** pattern around your **Day Master (日元 rì yuán)** — the stem of the day pillar.

Similarity: both are **typing systems** that compress complexity into a handle you can reason about.

Difference: Ba Zi ties the model to a **calendar clock** (year, month, day, hour pillars) and studies flow through **Decade Pillars (大运 / 流年)** over time.

Our **EightPillars** satellite leans into the MBTI parallel for discovery, then hands serious depth to the flagship **HexAstral** app.`,
  },
  {
    slug: 'i-ching-beginners-cast-hexagram',
    title: 'I Ching for Beginners: Casting a Hexagram (Zhou Yi 周易)',
    description:
      'Six lines form a hexagram; changing lines point to a second figure. Here is the minimum viable mental model.',
    date: '2026-05-08',
    appCta: 'coincast',
    body: `The I Ching (易經) / Zhou Yi (周易) is read through **64 hexagrams (六十四卦)**, each built from six yin or yang lines.

**Liu Yao (六爻)** hexagram practice animates the lines with coin or seed randomness; the pattern of "old" and "young" lines determines **changing lines (动爻)** and the **derived hexagram**.

Treat the result as a structured mirror for your question — not an external authority.

**CoinCast** (coming to the portfolio) focuses on this practice on iPhone; **HexAstral** already ships a full hexagram-study flow today.`,
  },
  {
    slug: 'chinese-face-reading-physiognomy',
    title: 'Chinese Face Reading (面相 Miàn Xiàng) and Modern AI',
    description:
      'Classical physiognomy maps feature zones to temperament and tendency. AI can assist feature extraction — with strict privacy hygiene.',
    date: '2026-05-08',
    appCta: 'faceoracle',
    body: `Mian Xiang (面相) studies stable facial features as **tendency signals** — closer to dermatoglyphics in spirit than to “judging souls.”

A serious product separates:
- **Deterministic anatomy notes** (what was observed)
- **Interpretive layer** framed as reflection, not fate

Our **FaceOracle** direction pairs camera capture with structured AI readings, cites the cultural source, and keeps **photos ephemeral** where possible — check the live Privacy Policy for processing details.

Always pair curiosity with consent and safety.`,
  },
  {
    slug: 'feng-shui-bedroom-five-steps',
    title: 'Feng Shui Your Bedroom in Five Gentle Steps (风水 Fēng Shuǐ)',
    description:
      'Start with orientation, clutter, bed position, light, and elemental balance — before buying “cure” gadgets.',
    date: '2026-05-08',
    appCta: 'fengshui',
    body: `Feng Shui (风水) reads how **qi (气)** moves through a space. A bedroom is a restoration room — calm wins.

1. **Clarify facing & sector** — know the compass reading of your bed wall and door (apps like our **FengShui AI** roadmap help).
2. **Command position** — bed where you see the door without being inline with it when practical.
3. **Reduce electromagnetic & visual noise** — especially at head height.
4. **Light & air** — circadian-kind lighting beats symbolic color panic.
5. **Elemental balance without superstition** — use wood/plant, textile, metal, stone as *material psychology*, not magic paint.

Consult professionals for renovation and safety; this is educational copy only.`,
  },
  {
    slug: 'eastern-synastry-compatibility',
    title: 'Eastern Synastry: Reading Two Charts Together (合盘 Hé Pán)',
    description:
      'Pair charts overlay Day Masters, branches, and palace resonance — friction and harmony can both be productive.',
    date: '2026-05-08',
    appCta: 'soulmatch',
    body: `Western users know **synastry**. In the Chinese stack, **He Pan (合盘)** fuses Ba Zi and Zi Wei lenses:

- **Day Master chemistry** — how stems and branches support or drain each other
- **Palace interplay** — which life domains amplify between you
- **Timing** — whether you are aligned or cross-current in decade/annual cycles

**SoulMatch** is the portfolio home for viral “compatibility moments” — quick score, deep report, respectful consent.

Scores describe **tendency**, not compatibility forever. People change; luck cycles change.`,
  },
  {
    slug: 'sheng-xiao-years-calendar-border',
    title: 'Chinese Animal Years (生肖) and the Calendar Border',
    description:
      'Your "sheng xiao year" follows the lunar new year boundary — not always January 1. Here is why that matters.',
    date: '2026-05-08',
    appCta: 'hexastral',
    body: `The twelve animals (十二生肖 shēng xiào) rotate on a **lunar-year** boundary anchored at **Li Chun (立春)** or cultural Spring Festival conventions depending on practitioner school.

If you were born in January or early February, **double-check** the year animal before meme-sharing.

HexAstral's engines use astronomical ephemeris for serious charting; this web article is only a cautionary note for casual readers.

When in doubt, use a **Ba Zi / Zi Wei** app with true solar time and city correction — not a single "sheng xiao meme."`,
  },
]

export function getAllBlogSlugs(): string[] {
  return BLOG_POSTS.map((p) => p.slug)
}

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug)
}
