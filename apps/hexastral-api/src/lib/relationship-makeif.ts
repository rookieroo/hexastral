/**
 * 关系决策推演 — 服务端投影 (Kindred Workstream B make-if)
 *
 * 纯函数层: 把本我 + 对方 (路由按 bond 模式取好) 喂给 astro-core
 * `planRelationshipDecision`, 投影成只含派生字段的 DTO。
 *
 * 隐私 (D2): 推演结果只有派生事实 (月柱/五行/冲合/评分/用神), 无任一方原始生辰;
 * 对方原始盘只在服务端用于排盘, 折叠成窗口后即丢弃。
 */

import { planRelationshipDecision, type RelationshipPerson } from '@zhop/astro-core'
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
  reasons: string[]
}

export interface RelMakeIfDTO {
  yongshen: string
  yongshenNote: string
  windows: RelMakeIfWindowDTO[]
  /** 推荐时机 (最高分窗口) 的 key; 无则 undefined。 */
  bestKey?: string
  verdict: string
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
  opts: { fromDate?: Date; months?: number } = {}
): RelMakeIfDTO {
  const egoInput = birthToInput(egoBirth)
  const otherInput = birthToInput(counterpart)
  if (!egoInput || !otherInput) {
    return { yongshen: '', yongshenNote: '', windows: [], verdict: '' }
  }
  const ego: RelationshipPerson = { input: egoInput, gender: egoBirth.gender }
  const other: RelationshipPerson = { input: otherInput, gender: counterpart.gender }

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
    reasons: w.reasons,
  }))
  return {
    yongshen: result.yongshen,
    yongshenNote: result.yongshenNote,
    windows,
    bestKey: result.best ? windowKey(result.best.year, result.best.month) : undefined,
    verdict: result.verdict,
  }
}
