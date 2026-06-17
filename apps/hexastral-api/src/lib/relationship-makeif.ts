/**
 * 关系决策推演 — 服务端投影 (Kindred Workstream B make-if)
 *
 * 纯函数层: 把本我 + 对方 (路由按 bond 模式取好) 喂给 astro-core
 * `planRelationshipDecision`, 投影成只含派生字段的 DTO。
 *
 * 隐私 (D2): 推演结果只有派生事实 (月柱/五行/冲合/评分/用神), 无任一方原始生辰;
 * 对方原始盘只在服务端用于排盘, 折叠成窗口后即丢弃。
 */

import {
  planRelationshipDecision,
  planRelationshipDecisionByYear,
  type RelationshipPerson,
  type ZiweiTimingSummary,
} from '@zhop/astro-core'
import { type BirthTriple, birthToInput } from './bonds-timeline'

/** 一个候选窗口 (派生)。 */
export interface RelMakeIfWindowDTO {
  /** 稳定键 `${year}-${month}`. */
  key: string
  year: number
  month: number
  date: string
  ganZhi: string
  element: string
  score: number
  lean: 'favorable' | 'mixed' | 'caution'
  isYongshen: boolean
  feedsYongshen: boolean
  harmony: boolean
  clash: boolean
  /** Move-specific 神煞: month is either party's 桃花 / 驿马, or feeds their 食伤. */
  taohua: boolean
  yima: boolean
  shishang: boolean
  /** 紫微 流月四化 also lights a bond palace this month (second-system corroboration). */
  ziwei: boolean
  reasons: string[]
}

/** One candidate YEAR (派生) — the long-horizon (10y) decision ranking. */
export interface RelMakeIfYearDTO {
  /** 稳定键 `${year}`. */
  key: string
  year: number
  date: string
  ganZhi: string
  element: string
  score: number
  lean: 'favorable' | 'mixed' | 'caution'
  isYongshen: boolean
  feedsYongshen: boolean
  harmony: boolean
  clash: boolean
  taohua: boolean
  yima: boolean
  shishang: boolean
  ziwei: boolean
  reasons: string[]
}

/** The 10-year (按年) tier — "哪一年最适合推进重大一步". */
export interface RelMakeIfLongtermDTO {
  years: RelMakeIfYearDTO[]
  bestYearKey?: string
  verdict: string
}

export interface RelMakeIfDTO {
  yongshen: string
  yongshenNote: string
  windows: RelMakeIfWindowDTO[]
  /** 推荐时机 (最高分窗口) 的 key; 无则 undefined。 */
  bestKey?: string
  verdict: string
  /** Long-horizon yearly ranking — present only when `fromYear` is supplied. */
  longterm?: RelMakeIfLongtermDTO
}

function windowKey(year: number, month: number): string {
  return `${year}-${month}`
}

/**
 * 本我盘 + 对方盘 → 隐私安全的关系决策 DTO。纯函数。
 * 任一方生辰非法 → 空推演 (路由应先校验本我)。
 */
export function buildBondMakeIf(
  egoBirth: BirthTriple,
  counterpart: BirthTriple,
  opts: {
    fromDate?: Date
    months?: number
    fromYear?: number
    years?: number
    /** 双方紫微摘要 (来自合盘报告)。A=本我, B=对方。两者皆有时折入评分。 */
    ziweiA?: ZiweiTimingSummary
    ziweiB?: ZiweiTimingSummary
    /** bond 关系标签 — 决定紫微按哪些宫位印证 (婚恋→夫妻, 亲子→父母/子女…)。 */
    relationshipLabel?: string
  } = {}
): RelMakeIfDTO {
  const egoInput = birthToInput(egoBirth)
  const otherInput = birthToInput(counterpart)
  if (!egoInput || !otherInput) {
    return { yongshen: '', yongshenNote: '', windows: [], verdict: '' }
  }
  const ego: RelationshipPerson = { input: egoInput, gender: egoBirth.gender }
  const other: RelationshipPerson = { input: otherInput, gender: counterpart.gender }

  // Long-horizon yearly tier — only when the caller supplies a starting year (so
  // the pure builder stays deterministic; the route passes the current year).
  let longterm: RelMakeIfLongtermDTO | undefined
  if (opts.fromYear != null) {
    const yr = planRelationshipDecisionByYear(ego, other, {
      fromYear: opts.fromYear,
      years: opts.years,
      ziweiA: opts.ziweiA,
      ziweiB: opts.ziweiB,
      relationshipLabel: opts.relationshipLabel,
    })
    longterm = {
      years: yr.years.map((y) => ({
        key: String(y.year),
        year: y.year,
        date: y.date,
        ganZhi: y.ganZhi,
        element: y.element,
        score: y.score,
        lean: y.lean,
        isYongshen: y.isYongshen,
        feedsYongshen: y.feedsYongshen,
        harmony: y.harmony,
        clash: y.clash,
        taohua: y.taohua,
        yima: y.yima,
        shishang: y.shishang,
        ziwei: y.ziwei,
        reasons: y.reasons,
      })),
      bestYearKey: yr.best ? String(yr.best.year) : undefined,
      verdict: yr.verdict,
    }
  }

  const result = planRelationshipDecision(ego, other, opts)
  const windows: RelMakeIfWindowDTO[] = result.windows.map((w) => ({
    key: windowKey(w.year, w.month),
    year: w.year,
    month: w.month,
    date: w.date,
    ganZhi: w.ganZhi,
    element: w.element,
    score: w.score,
    lean: w.lean,
    isYongshen: w.isYongshen,
    feedsYongshen: w.feedsYongshen,
    harmony: w.harmony,
    clash: w.clash,
    taohua: w.taohua,
    yima: w.yima,
    shishang: w.shishang,
    ziwei: w.ziwei,
    reasons: w.reasons,
  }))
  return {
    yongshen: result.yongshen,
    yongshenNote: result.yongshenNote,
    windows,
    bestKey: result.best ? windowKey(result.best.year, result.best.month) : undefined,
    verdict: result.verdict,
    longterm,
  }
}
