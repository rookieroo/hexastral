/**
 * Xingqi canonical stack (V1 product lock — not multi-school UI).
 *
 * Face: 三停 · 五岳 · 十二宫 · 五官 · 气色骨肉 (麻衣谱系常用框架)
 * Palm: 主纹 + 丘位 (mounts；中译西名丘位，与 VLM mounts 字段一致)
 * Natal: 日主 · 用神 · 通关 · 五行生克 · 大运流年流月
 * Tone: 宜留意 / 气机 — cultural study, not fate
 *
 * Chapter ↔ seal ↔ ink ↔ primary vocab (Symbols + Primer SSOT).
 */

import { CHAPTER_GLYPH, type InkRelation, type XingqiGlyphKey } from '@/lib/ancient-glyphs'
import type { XingqiChapterKind } from '@/lib/report-chapters'

export type ChapterCanon = {
  kind: XingqiChapterKind
  glyph: XingqiGlyphKey
  ink: InkRelation
  titleZh: string
  titleEn: string
  sealBlurbZh: string
  sealBlurbEn: string
  /** Terms the LLM should prefer in this chapter */
  vocabZh: string
  vocabEn: string
}

export const XINGQI_CHAPTER_CANON: readonly ChapterCanon[] = [
  {
    kind: 'overview',
    glyph: '象',
    ink: 'gather',
    titleZh: '总格局',
    titleEn: 'Overview',
    sealBlurbZh: '象 — 观象（见系）',
    sealBlurbEn: 'Observing form (见 lineage)',
    vocabZh: '形气、气色、骨相、肉相、气机',
    vocabEn: 'form-qi, complexion, bone/flesh, qi motion',
  },
  {
    kind: 'face',
    glyph: '面',
    ink: 'gather',
    titleZh: '面部',
    titleEn: 'Face',
    sealBlurbZh: '面 — 目颊象形',
    sealBlurbEn: 'Face pictograph',
    vocabZh: '三停、五岳、十二宫、五官、天庭、印堂、山根、年寿、准头、人中、地阁',
    vocabEn: 'three courts, five peaks, twelve palaces, features',
  },
  {
    kind: 'palms',
    glyph: '又',
    ink: 'pair',
    titleZh: '双手',
    titleEn: 'Palms',
    sealBlurbZh: '又 — 甲骨侧掌三指',
    sealBlurbEn: 'Oracle-bone side-hand (three fingers)',
    vocabZh: '掌形、生命线、智慧线、感情线、事业线、七丘（金星/木星/土星/太阳/水星/月/火星）、纹记、左右对照',
    vocabEn: 'palm shape, major lines, seven mounts, marks, left/right pair',
  },
  {
    kind: 'natal',
    glyph: '命',
    ink: 'contrast',
    titleZh: '形气 × 八字',
    titleEn: 'Form × BaZi',
    sealBlurbZh: '命 — 禀命对照',
    sealBlurbEn: 'Natal charge',
    vocabZh: '日主、用神、通关、相生、相克、比和、五行',
    vocabEn: 'day master, yongshen, wuxing relations',
  },
  {
    kind: 'horizon',
    glyph: '月',
    ink: 'flow',
    titleZh: '近运与行动',
    titleEn: 'Near & Next',
    sealBlurbZh: '月 — 近窗与行动',
    sealBlurbEn: 'Near window + actions',
    vocabZh: '流年、流月、大运、宜留意、气机窗口、可执行动作',
    vocabEn: 'year/month luck, windows, actionable steps',
  },
  {
    kind: 'period',
    glyph: '月',
    ink: 'flow',
    titleZh: '本期窗口',
    titleEn: 'Period',
    sealBlurbZh: '月 — 时间窗',
    sealBlurbEn: 'Period moon',
    vocabZh: '流年、流月、大运、宜留意、气机窗口',
    vocabEn: 'year/month luck, windows worth noting',
  },
  {
    kind: 'advice',
    glyph: '永',
    ink: 'flow',
    titleZh: '建议',
    titleEn: 'Advice',
    sealBlurbZh: '永 — 长流之宜',
    sealBlurbEn: 'Lasting counsel',
    vocabZh: '宜留意、气机、收束、观察窗口',
    vocabEn: 'worth noting, qi motion, observation',
  },
] as const

export function canonForChapter(kind: XingqiChapterKind): ChapterCanon {
  return XINGQI_CHAPTER_CANON.find((c) => c.kind === kind) ?? XINGQI_CHAPTER_CANON[0]!
}

/** Alias → canonical term for tap resolve (glossary shows canonical only). */
export const XINGQI_TERM_ALIASES: Record<string, string> = {
  头脑线: '智慧线',
  心脏线: '感情线',
  命运线: '事业线',
  三庭: '三停',
  子女宫: '男女宫',
  妻妾宫: '夫妻宫',
}

// Re-export glyph map consistency check helper for tests / primer
export function assertChapterGlyphsAligned(): boolean {
  return XINGQI_CHAPTER_CANON.every((c) => CHAPTER_GLYPH[c.kind] === c.glyph)
}
