/**
 * 玄空飞星 — 格局识别 (pattern detection).
 *
 * Deterministic predicates over the 9-palace charts. These are the structural
 * verdicts a practitioner reads off a chart before any 形势 (峦头) input:
 *
 *   - 旺山旺向 / 上山下水 — the two primary 山向 dispositions (丁财)
 *   - 双星会向 / 双星会坐 — 当旺山向 both to one side
 *   - 合十 — 山盘 or 向盘 与运盘合十 (通气)
 *   - 父母三般卦 (147/258/369) / 连珠三般卦 (连续) — 通气贯三元
 *   - 全盘伏吟 / 全盘反吟 — vs 元旦盘 (洛书)
 *
 * Lineage: 沈氏玄空 (consistent with flying-stars.ts). 七星打劫 / 城门诀 are
 * deferred to a later increment (they need extra context + careful test corpora).
 *
 * Pure functions, no I/O. Pairs with `flying-stars.ts` + the form-li engine.
 */

import type { NineChart, YuanYun } from './flying-stars'
import { NINE_CHART_KEYS } from './flying-stars'
import type { BaguaPalace } from './twenty-four-mountains'

export type FlyingStarPatternKind =
  | '旺山旺向'
  | '上山下水'
  | '双星会向'
  | '双星会坐'
  | '合十'
  | '父母三般卦'
  | '连珠三般卦'
  | '全盘伏吟'
  | '全盘反吟'

export interface FlyingStarPattern {
  kind: FlyingStarPatternKind
  quality: 'auspicious' | 'inauspicious' | 'special'
  /** Which chart the pattern reads from (合十/伏吟/反吟); '全局' for 三般卦. */
  scope?: '山盘' | '向盘' | '全局'
  note: string
}

export interface DetectPatternsInput {
  yuanYun: YuanYun
  sitPalace: BaguaPalace
  facePalace: BaguaPalace
  periodChart: NineChart<YuanYun>
  mountainChart: NineChart<YuanYun>
  facingChart: NineChart<YuanYun>
}

/** 元旦盘 (洛书 standard layout). */
const YUAN_DAN: NineChart<YuanYun> = {
  坎: 1,
  坤: 2,
  震: 3,
  巽: 4,
  中: 5,
  乾: 6,
  兑: 7,
  艮: 8,
  离: 9,
}

/** 合十 partner (对宫数); 5 is its own partner. */
function complement10(n: YuanYun): YuanYun {
  return (n === 5 ? 5 : 10 - n) as YuanYun
}

const SANBAN_GROUPS: readonly (readonly YuanYun[])[] = [
  [1, 4, 7],
  [2, 5, 8],
  [3, 6, 9],
]

function sameTriple(a: readonly number[], b: readonly number[]): boolean {
  const x = [...a].sort((m, n) => m - n)
  const y = [...b].sort((m, n) => m - n)
  return x.length === y.length && x.every((v, i) => v === y[i])
}

/** Three distinct numbers that are consecutive on the 1-9 loop (incl. wraps). */
function isConsecutiveTriple(nums: readonly number[]): boolean {
  if (new Set(nums).size !== 3) return false
  const s = [...nums].sort((a, b) => a - b)
  if (s[1] === (s[0] as number) + 1 && s[2] === (s[1] as number) + 1) return true
  // wraps on the 1..9 cycle
  if (s[0] === 1 && s[1] === 2 && s[2] === 9) return true // 9,1,2
  if (s[0] === 1 && s[1] === 8 && s[2] === 9) return true // 8,9,1
  return false
}

/** Detect all structural 格局 present in a chart set. */
export function detectPatterns(input: DetectPatternsInput): FlyingStarPattern[] {
  const { yuanYun, sitPalace, facePalace, periodChart, mountainChart, facingChart } = input
  const out: FlyingStarPattern[] = []

  const mSit = mountainChart[sitPalace]
  const mFace = mountainChart[facePalace]
  const fSit = facingChart[sitPalace]
  const fFace = facingChart[facePalace]

  // ── 山向 disposition (mutually exclusive structural verdicts) ──
  if (mSit === yuanYun && fFace === yuanYun) {
    out.push({
      kind: '旺山旺向',
      quality: 'auspicious',
      note: '当旺山星到坐、向星到向，丁财两旺之上格。',
    })
  }
  if (mFace === yuanYun && fSit === yuanYun) {
    out.push({
      kind: '上山下水',
      quality: 'inauspicious',
      note: '当旺山星到向、向星到坐，损丁破财；需后水前山等形势救应。',
    })
  }
  if (mFace === yuanYun && fFace === yuanYun) {
    out.push({
      kind: '双星会向',
      quality: 'special',
      scope: '向盘',
      note: '山向当旺星俱到向首，旺财，向首宜见水见动。',
    })
  }
  if (mSit === yuanYun && fSit === yuanYun) {
    out.push({
      kind: '双星会坐',
      quality: 'special',
      scope: '山盘',
      note: '山向当旺星俱到坐山，旺丁，坐后宜见山见实。',
    })
  }

  // ── 合十 (与运盘) ──
  if (NINE_CHART_KEYS.every((k) => mountainChart[k] + periodChart[k] === 10)) {
    out.push({
      kind: '合十',
      quality: 'auspicious',
      scope: '山盘',
      note: '山盘与运盘合十，通气得用，主旺丁。',
    })
  }
  if (NINE_CHART_KEYS.every((k) => facingChart[k] + periodChart[k] === 10)) {
    out.push({
      kind: '合十',
      quality: 'auspicious',
      scope: '向盘',
      note: '向盘与运盘合十，通气得用，主旺财。',
    })
  }

  // ── 三般卦 (全局，山+向+运 三盘合参) ──
  const parentSanban = NINE_CHART_KEYS.every((k) =>
    SANBAN_GROUPS.some((g) => sameTriple([mountainChart[k], facingChart[k], periodChart[k]], g))
  )
  if (parentSanban) {
    out.push({
      kind: '父母三般卦',
      quality: 'special',
      scope: '全局',
      note: '一四七／二五八／三六九通贯三元，连气化煞，财丁两美。',
    })
  } else {
    const pearlSanban = NINE_CHART_KEYS.every((k) =>
      isConsecutiveTriple([mountainChart[k], facingChart[k], periodChart[k]])
    )
    if (pearlSanban) {
      out.push({
        kind: '连珠三般卦',
        quality: 'special',
        scope: '全局',
        note: '连珠相生，三盘流通，气脉贯串。',
      })
    }
  }

  // ── 反伏吟 (vs 元旦盘) ──
  if (NINE_CHART_KEYS.every((k) => mountainChart[k] === YUAN_DAN[k])) {
    out.push({
      kind: '全盘伏吟',
      quality: 'inauspicious',
      scope: '山盘',
      note: '山盘伏吟元旦盘，主停滞、丁口不安。',
    })
  }
  if (NINE_CHART_KEYS.every((k) => facingChart[k] === YUAN_DAN[k])) {
    out.push({
      kind: '全盘伏吟',
      quality: 'inauspicious',
      scope: '向盘',
      note: '向盘伏吟元旦盘，主财气呆滞。',
    })
  }
  if (NINE_CHART_KEYS.every((k) => mountainChart[k] === complement10(YUAN_DAN[k]))) {
    out.push({
      kind: '全盘反吟',
      quality: 'inauspicious',
      scope: '山盘',
      note: '山盘反吟，主冲突动荡、伤丁。',
    })
  }
  if (NINE_CHART_KEYS.every((k) => facingChart[k] === complement10(YUAN_DAN[k]))) {
    out.push({
      kind: '全盘反吟',
      quality: 'inauspicious',
      scope: '向盘',
      note: '向盘反吟，主破耗反复。',
    })
  }

  return out
}
