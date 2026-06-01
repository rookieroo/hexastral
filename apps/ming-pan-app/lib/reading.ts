/**
 * Helpers that turn the user's birth data + astro-core primitives into
 * exactly the numbers + labels the /reading screen displays.
 *
 * Three derivations on top of computeFateNatalChart:
 *   • computeWuxingCount  — 8 stems+branches → { 木, 火, 土, 金, 水 } counts
 *   • computeDayunChain   — 7 visible 大运 steps centred on current age
 *   • analyzeDayunRelation — categorise active 大运 vs 日主 → label/gloss
 *
 * Keep the JUDGEMENT layer (gloss prose) deliberately short + templated.
 * Deep LLM interpretation is K.4 territory.
 */

import {
  BRANCH_WUXING,
  calculateDaYun,
  type DaYunStep,
  type FourPillars,
  type GanZhi,
  type Gender,
  getDaYunAtYear,
  type HeavenlyStem,
  STEM_WUXING,
  WUXING_GENERATE,
  WUXING_OVERCOME,
  type WuXing,
} from '@zhop/astro-core'

// ── 五行 count from all 8 stems + branches ──────────────────────

export type WuxingCount = Record<WuXing, number>

export function computeWuxingCount(pillars: FourPillars): WuxingCount {
  const c: WuxingCount = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
  c[STEM_WUXING[pillars.year.stem]]++
  c[STEM_WUXING[pillars.month.stem]]++
  c[STEM_WUXING[pillars.day.stem]]++
  c[STEM_WUXING[pillars.hour.stem]]++
  c[BRANCH_WUXING[pillars.year.branch]]++
  c[BRANCH_WUXING[pillars.month.branch]]++
  c[BRANCH_WUXING[pillars.day.branch]]++
  c[BRANCH_WUXING[pillars.hour.branch]]++
  return c
}

/** The WuXing with the highest count (ties: stable order 木火土金水). */
export function maxWuxing(counts: WuxingCount): WuXing {
  const ORDER: WuXing[] = ['木', '火', '土', '金', '水']
  let best: WuXing = '木'
  let bestN = -1
  for (const k of ORDER) {
    if (counts[k] > bestN) {
      best = k
      bestN = counts[k]
    }
  }
  return best
}

// ── 大运 chain — 7 visible steps centred on current age ─────────

export type DayunVisible = {
  index: number
  ganZhi: GanZhi
  startAge: number
  endAge: number
  startYear: number
  endYear: number
  isCurrent: boolean
}

const DAYUN_VISIBLE_COUNT = 7

/**
 * Returns 7 大运 steps with one of them marked isCurrent. Centres the active
 * step in the visible window when possible (current = index 3 of 7).
 */
export function computeDayunChain(
  birthDate: { year: number; month: number; day: number; hour: number },
  gender: Gender,
  currentYear: number = new Date().getFullYear()
): { steps: DayunVisible[]; currentVisibleIndex: number } {
  // Request enough steps that we can centre the current one
  const all = calculateDaYun(birthDate, gender, 10)
  const active = getDaYunAtYear(all, currentYear)
  const activeAbsIndex = active ? active.index - 1 : 0 // index is 1-based

  // Centre the active step in a 7-item window
  let start = activeAbsIndex - 3
  if (start < 0) start = 0
  if (start + DAYUN_VISIBLE_COUNT > all.steps.length) {
    start = Math.max(0, all.steps.length - DAYUN_VISIBLE_COUNT)
  }
  const window = all.steps.slice(start, start + DAYUN_VISIBLE_COUNT)
  const currentVisibleIndex = activeAbsIndex - start

  const steps: DayunVisible[] = window.map((s) => ({
    index: s.index,
    ganZhi: s.ganZhi,
    startAge: s.startAge,
    endAge: s.endAge,
    startYear: s.startYear,
    endYear: s.endYear,
    isCurrent: s.index - 1 === activeAbsIndex,
  }))
  return { steps, currentVisibleIndex }
}

// ── 现运 vs 日主 relation ────────────────────────────────────────

export type DayunRelation =
  | { kind: 'self'; label: string; gloss: string } // 比劫
  | { kind: 'output'; label: string; gloss: string } // 食伤
  | { kind: 'wealth'; label: string; gloss: string } // 财
  | { kind: 'authority'; label: string; gloss: string } // 官杀
  | { kind: 'seal'; label: string; gloss: string } // 印

/**
 * Categorise the active dayun's stem vs day-master and return label + a short
 * templated gloss. Five categories follow the classical 十神 framing.
 */
export function analyzeDayunRelation(
  step: DayunVisible | DaYunStep,
  dayMaster: HeavenlyStem
): DayunRelation {
  const dayWuxing = STEM_WUXING[dayMaster]
  const dayunWuxing = STEM_WUXING[step.ganZhi.stem]
  const age = step.startAge

  if (dayWuxing === dayunWuxing) {
    return {
      kind: 'self',
      label: '比劫之运 · 立身',
      gloss: `${step.ganZhi.stem}${step.ganZhi.branch}大运（${age}–${step.endAge}岁）：同气相求，立身之运。结盟可成，亦防同途相争。`,
    }
  }
  if (WUXING_GENERATE[dayWuxing] === dayunWuxing) {
    return {
      kind: 'output',
      label: '食伤之运 · 创显',
      gloss: `${step.ganZhi.stem}${step.ganZhi.branch}大运（${age}–${step.endAge}岁）：日主泄秀，才华外显，宜创、宜表达；唯须节用，不可逞才。`,
    }
  }
  if (WUXING_OVERCOME[dayWuxing] === dayunWuxing) {
    return {
      kind: 'wealth',
      label: '财星之运 · 谋利',
      gloss: `${step.ganZhi.stem}${step.ganZhi.branch}大运（${age}–${step.endAge}岁）：财来就我，进取有得；唯须脚踏实地，重义气不可吝财。`,
    }
  }
  if (WUXING_OVERCOME[dayunWuxing] === dayWuxing) {
    return {
      kind: 'authority',
      label: '官杀之运 · 承位',
      gloss: `${step.ganZhi.stem}${step.ganZhi.branch}大运（${age}–${step.endAge}岁）：受官受名，承位之运。当受则受，不必躲;但忌躁进、不可越权。`,
    }
  }
  // dayunWuxing 生 dayWuxing → 印
  return {
    kind: 'seal',
    label: '印星之运 · 受贵',
    gloss: `${step.ganZhi.stem}${step.ganZhi.branch}大运（${age}–${step.endAge}岁）：受人之恩，得贵人提携。宜读书、宜契文，事业有上之挽。`,
  }
}

// ── parse "YYYY-MM-DD" into the year+month+day+hour shape astro-core wants ──

export function parseBirthInput(
  solarDate: string,
  timeIndex: number
): { year: number; month: number; day: number; hour: number } {
  const parts = solarDate.split('-')
  const year = Number.parseInt(parts[0] ?? '', 10)
  const month = Number.parseInt(parts[1] ?? '', 10)
  const day = Number.parseInt(parts[2] ?? '', 10)
  // Same representative-hour mapping as lib/natal.ts (mirror svc-astro fallback)
  let hour: number
  if (timeIndex <= 0) hour = 0
  else if (timeIndex >= 12) hour = 23
  else hour = timeIndex * 2 - 1
  return { year, month, day, hour }
}
