import type { DayMasterSlug, FengShuiSlug, PalaceSlug, ZodiacSlug } from '@/lib/growth/seo-data'

export const dayMasterPages: Record<
  DayMasterSlug,
  { han: string; pinyin: string; english: string; element: string; blurb: string }
> = {
  'jia-wood': {
    han: '甲',
    pinyin: 'Jiǎ',
    english: 'Yang Wood Day Master',
    element: 'Wood (Yang)',
    blurb:
      'Jiǎ wood is often read as the upright tree — initiative, structure, and a drive to break through inertia. In modern copy we frame it as leadership energy that still needs roots (rest, allies, and timelines).',
  },
  'yi-wood': {
    han: '乙',
    pinyin: 'Yǐ',
    english: 'Yin Wood Day Master',
    element: 'Wood (Yin)',
    blurb:
      'Yǐ wood behaves like vines and grasses — adaptive, persuasive, and resilient in tight spaces. The risk pattern is over‑accommodation; the gift is versatile growth.',
  },
  'bing-fire': {
    han: '丙',
    pinyin: 'Bǐng',
    english: 'Yang Fire Day Master',
    element: 'Fire (Yang)',
    blurb:
      'Bǐng fire reads as radiance — visibility, warmth, and generous expression. Balance with boundaries and recovery so the flame does not consume the schedule.',
  },
  'ding-fire': {
    han: '丁',
    pinyin: 'Dīng',
    english: 'Yin Fire Day Master',
    element: 'Fire (Yin)',
    blurb:
      'Dīng fire is candlelight — focus, craft, and intimacy. It refine‑details well; watch for sensitivity to criticism and the need for quieter recovery.',
  },
  'wu-earth': {
    han: '戊',
    pinyin: 'Wù',
    english: 'Yang Earth Day Master',
    element: 'Earth (Yang)',
    blurb:
      'Wù earth is the mountain — reliability, containment, and stewardship. Growth often comes from pacing and delegating instead of carrying everything alone.',
  },
  'ji-earth': {
    han: '己',
    pinyin: 'Jǐ',
    english: 'Yin Earth Day Master',
    element: 'Earth (Yin)',
    blurb:
      'Jǐ earth is fertile soil — nourishing, practical, and attentive to process. The edge case is worry loops; the upside is systems that actually ship.',
  },
  'geng-metal': {
    han: '庚',
    pinyin: 'Gēng',
    english: 'Yang Metal Day Master',
    element: 'Metal (Yang)',
    blurb:
      'Gēng metal is axe and ore — clarity, standards, and decisive cuts. Pair it with diplomacy training; the gift is integrity, the snag is abrasiveness under stress.',
  },
  'xin-metal': {
    han: '辛',
    pinyin: 'Xīn',
    english: 'Yin Metal Day Master',
    element: 'Metal (Yin)',
    blurb:
      'Xīn metal is jewel and blade finished — precision, taste, and discernment. Boundaries are healthy; perfectionism may need scheduled release valves.',
  },
  'ren-water': {
    han: '壬',
    pinyin: 'Rén',
    english: 'Yang Water Day Master',
    element: 'Water (Yang)',
    blurb:
      'Rén water is the great river — momentum, exploration, and networked intelligence. Containers (habits, budgets, agreements) keep the current generative.',
  },
  'gui-water': {
    han: '癸',
    pinyin: 'Guǐ',
    english: 'Yin Water Day Master',
    element: 'Water (Yin)',
    blurb:
      'Guǐ water is mist and rain — subtle influence, intuition, and strategy in small moves. Protect sleep and signal‑to‑noise; the mind is the instrument.',
  },
}

export const palacePages: Record<
  PalaceSlug,
  { han: string; pinyin: string; english: string; blurb: string }
> = {
  'life-palace': {
    han: '命宫',
    pinyin: 'Mìng Gōng',
    english: 'Life Palace',
    blurb:
      'The Life Palace is the lens for overall tone — how you meet the world, stitch identity, and mobilize your baseline strengths. In product terms, it is closer to “rising sign + core plot” than any single score.',
  },
  siblings: {
    han: '兄弟',
    pinyin: 'Xiōng Dì',
    english: 'Siblings & Peers Palace',
    blurb:
      'Peers, collaborations, and competitive bandwidth — who you can stand shoulder‑to‑shoulder with, and how rivalry teaches you.',
  },
  spouse: {
    han: '夫妻',
    pinyin: 'Fū Qī',
    english: 'Spouse & Partnership Palace',
    blurb:
      'Long‑form intimacy patterns: attraction style, negotiation tone, and recurring friction themes. Not a marriage verdict — a map for communication.',
  },
  children: {
    han: '子女',
    pinyin: 'Zǐ Nǚ',
    english: 'Children & Legacy Palace',
    blurb:
      'Creativity, mentees, founders’ “babies,” and literal children — what you birth into the world and how you nurture novelty.',
  },
  wealth: {
    han: '财帛',
    pinyin: 'Cái Bó',
    english: 'Wealth Palace',
    blurb:
      'Cash flow psychology, resource skill, and confidence around exchange. Useful for career negotiations and business model fit questions.',
  },
  health: {
    han: '疾厄',
    pinyin: 'Jí È',
    english: 'Vitality & Stress Palace',
    blurb:
      'Energy troughs, sustained stress, and somatic “check engine lights.” Educational only — doctors still beat divination.',
  },
  travel: {
    han: '迁移',
    pinyin: 'Qiān Yí',
    english: 'Travel & Exterior Palace',
    blurb:
      'Relocation luck, outward reputation in foreign contexts, and the ROI of shaking up geography.',
  },
  friends: {
    han: '交友',
    pinyin: 'Jiāo Yǒu',
    english: 'Friends & Social Palace',
    blurb:
      'Aquaintance ecosystems, introductions, crowds, and mentorship adjacency — your network laboratory.',
  },
  career: {
    han: '官禄',
    pinyin: 'Guān Lù',
    english: 'Career & Responsibility Palace',
    blurb:
      'Duty, mastery, ambition arcs, and public craft. Analogous to the midheaven storyline in Western astrology when we translate for English readers.',
  },
  property: {
    han: '田宅',
    pinyin: 'Tián Zhái',
    english: 'Property & Roots Palace',
    blurb:
      'Physical home, workspaces, and inherited stability — where you store safety and long‑horizon capital.',
  },
  'fortune-spirit': {
    han: '福德',
    pinyin: 'Fú Dé',
    english: 'Fortune & Spirit Palace',
    blurb:
      'Inner weather: joy capacity, meaning‑making, and how you recharge metaphysically (not religiously prescriptive).',
  },
  parents: {
    han: '父母',
    pinyin: 'Fù Mǔ',
    english: 'Parents & Authority Palace',
    blurb:
      'Caregiver patterns, institutional authority, and early imprinting — how you relate to structure and instruction.',
  },
}

export const zodiacPages: Record<ZodiacSlug, { han: string; pinyin: string; blurb: string }> = {
  rat: {
    han: '鼠',
    pinyin: 'Shǔ',
    blurb: 'Quick, resourceful, socially alert — and sensitive to fine‑grained risk.',
  },
  ox: {
    han: '牛',
    pinyin: 'Niú',
    blurb: 'Stamina, integrity, and long timelines; watch for stubborn lag when context shifts.',
  },
  tiger: {
    han: '虎',
    pinyin: 'Hǔ',
    blurb: 'Courage, initiative, charisma; pair with recovery rituals to avoid burnout bids.',
  },
  rabbit: {
    han: '兔',
    pinyin: 'Tù',
    blurb: 'Diplomatic, aesthetic, harmonic — excels when contexts reward tact over blunt force.',
  },
  dragon: {
    han: '龙',
    pinyin: 'Lóng',
    blurb:
      'Magnetic ambition and mythic stakes; grounding practices keep dragons effective, not chaotic.',
  },
  snake: {
    han: '蛇',
    pinyin: 'Shé',
    blurb:
      'Strategic intuition, persuasive calm, secrecy as a skill — clarity contracts prevent misunderstandings.',
  },
  horse: {
    han: '马',
    pinyin: 'Mǎ',
    blurb: 'Freedom‑loving mover; thrives with autonomy metrics and spaced deadlines.',
  },
  goat: {
    han: '羊',
    pinyin: 'Yáng',
    blurb:
      'Co‑creative caretaker archetype — strong rapport, benefits from explicit reciprocity cues.',
  },
  monkey: {
    han: '猴',
    pinyin: 'Hóu',
    blurb: 'Adaptive wit, improvisation, tactical humor; systems help finish what wit starts.',
  },
  rooster: {
    han: '鸡',
    pinyin: 'Jī',
    blurb: 'Standards, showmanship, integrity signaling; soften edges when trust is scarce.',
  },
  dog: {
    han: '狗',
    pinyin: 'Gǒu',
    blurb:
      'Loyalty, sentinel instincts, ethic of protection — beware anxiety loops about loyalty tests.',
  },
  pig: {
    han: '猪',
    pinyin: 'Zhū',
    blurb: 'Sincerity, savoring life, stamina for hospitality; boundaries protect generosity.',
  },
}

export const fengShuiPages: Record<FengShuiSlug, { title: string; blurb: string }> = {
  bedroom: {
    title: 'Bedroom Feng Shui (卧室)',
    blurb:
      'Prioritize rest: bed command where practical, softened corners, blackout options, and low‑drama palettes. Mirrors facing the sleep line are debated across schools — treat variants as design psychology, not fear.',
  },
  office: {
    title: 'Office / Desk Feng Shui (办公)',
    blurb:
      'Desk in command of the door when possible; warm task light; separate deep work from inbox triage visually. Qi moves where attention goes.',
  },
  'front-door': {
    title: 'Front Door & Entry (门户)',
    blurb:
      'Entries are “mouth of qi.” Clear sightlines, working hardware, and uncluttered thresholds read as respect for opportunity — both symbolically and socially.',
  },
}
