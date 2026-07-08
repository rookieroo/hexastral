/**
 * Report digest — deterministic headline summary from compute JSON.
 *
 * Replaces percentile "风水指数" with practitioner-style verdicts: 格局 chip,
 * 宅命 chip, exterior note, and 1–2 focus palaces. No aggregate score.
 *
 * Used by feng-app report cover, share cards (future), and list previews once
 * the sites API embeds compute summaries.
 */

import type { FengComputeJson } from '../types'

export type DigestTone = 'accent' | 'neutral' | 'caution' | 'danger'

export type FormLiVerdict = '旺丁' | '旺财' | '损丁' | '破财' | '动凶' | '化煞' | '平'

const VERDICT_PRIORITY: Record<FormLiVerdict, number> = {
  动凶: 0,
  破财: 1,
  损丁: 2,
  化煞: 3,
  平: 4,
  旺财: 5,
  旺丁: 6,
}

const MALEFIC: ReadonlySet<FormLiVerdict> = new Set(['动凶', '破财', '损丁'])
const AUSPICIOUS: ReadonlySet<FormLiVerdict> = new Set(['旺丁', '旺财'])

/** Primary disposition patterns — shown first when present. */
const PRIMARY_PATTERNS = new Set(['旺山旺向', '上山下水', '双星会向', '双星会坐'])

export interface DigestFocusItem {
  palace: string
  verdict: FormLiVerdict
  tone: DigestTone
}

export interface DigestPattern {
  kind: string
  quality: 'auspicious' | 'inauspicious' | 'special' | 'neutral'
  /** null = no patternRescue row for this kind. */
  rescued: boolean | null
}

export type DigestHeadline =
  | { type: 'pattern_rescue'; pattern: string; rescued: boolean }
  | { type: 'focus'; palace: string; verdict: FormLiVerdict }
  | { type: 'exterior_sha'; count: number }
  | { type: 'concord_mismatch' }
  | { type: 'ping' }

export interface ReportDigest {
  chartLine: {
    sitMountain: string
    faceMountain: string
    buildYuan: number
    currentYuan: number
    chartMethod: '下卦' | '替卦'
  }
  pattern: DigestPattern
  concord: 'matched' | 'mismatched' | 'unknown'
  exterior: {
    tier: 'clean' | 'sha_light' | 'sha_heavy'
    shaCount: number
  }
  focus: DigestFocusItem[]
  headline: DigestHeadline
  confidence: 'high' | 'medium' | 'low' | 'omitted'
  /** 0–100 input completeness from server dataQuality.inputScore. */
  inputScore?: number
}

function verdictTone(verdict: FormLiVerdict): DigestTone {
  if (AUSPICIOUS.has(verdict)) return 'accent'
  if (verdict === '化煞' || verdict === '平') return 'neutral'
  return 'danger'
}

function pickPrimaryPattern(compute: FengComputeJson): DigestPattern {
  const patterns = compute.patterns ?? []
  const rescues = compute.formLi?.patternRescue ?? []

  const primary =
    patterns.find((p) => PRIMARY_PATTERNS.has(p.kind)) ??
    patterns.find((p) => p.quality === 'inauspicious') ??
    patterns[0]

  if (!primary) {
    return { kind: '平局', quality: 'neutral', rescued: null }
  }

  const rescue = rescues.find((r) => r.pattern === primary.kind)
  return {
    kind: primary.kind,
    quality: primary.quality,
    rescued: rescue ? rescue.favourable : null,
  }
}

function collectFocus(compute: FengComputeJson): DigestFocusItem[] {
  const palaces = compute.formLi?.palaces ?? []
  const items: DigestFocusItem[] = []

  for (const pl of palaces) {
    for (const f of pl.findings) {
      if (f.verdict === '平') continue
      items.push({
        palace: pl.palace,
        verdict: f.verdict,
        tone: verdictTone(f.verdict),
      })
    }
  }

  items.sort(
    (a, b) =>
      VERDICT_PRIORITY[a.verdict] - VERDICT_PRIORITY[b.verdict] ||
      a.palace.localeCompare(b.palace, 'zh')
  )

  const seen = new Set<string>()
  const deduped: DigestFocusItem[] = []
  for (const item of items) {
    const key = `${item.palace}:${item.verdict}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(item)
    if (deduped.length >= 2) break
  }
  return deduped
}

function countExteriorSha(compute: FengComputeJson, visionShaCount?: number): number {
  if (typeof visionShaCount === 'number' && visionShaCount >= 0) {
    return visionShaCount
  }
  const palaces = compute.formLi?.palaces ?? []
  const hitPalaces = new Set<string>()
  for (const pl of palaces) {
    if (pl.findings.some((f) => f.verdict === '化煞' || f.verdict === '动凶')) {
      hitPalaces.add(pl.palace)
    }
  }
  return hitPalaces.size
}

function pickHeadline(
  pattern: DigestPattern,
  focus: DigestFocusItem[],
  exterior: ReportDigest['exterior'],
  concord: ReportDigest['concord']
): DigestHeadline {
  if (pattern.kind === '上山下水' && pattern.rescued === false) {
    return { type: 'pattern_rescue', pattern: pattern.kind, rescued: false }
  }
  if (pattern.kind === '旺山旺向' && pattern.rescued === true) {
    return { type: 'pattern_rescue', pattern: pattern.kind, rescued: true }
  }

  const topMalefic = focus.find((f) => MALEFIC.has(f.verdict))
  if (topMalefic) {
    return { type: 'focus', palace: topMalefic.palace, verdict: topMalefic.verdict }
  }

  if (exterior.tier === 'sha_heavy') {
    return { type: 'exterior_sha', count: exterior.shaCount }
  }

  if (concord === 'mismatched') {
    return { type: 'concord_mismatch' }
  }

  return { type: 'ping' }
}

/**
 * Build a locale-neutral digest from deterministic compute output.
 * Returns null when flying stars are missing (cannot summarize).
 */
export function deriveReportDigest(
  compute: FengComputeJson | null | undefined,
  confidence: ReportDigest['confidence'] = 'high',
  options?: { visionShaCount?: number; inputScore?: number }
): ReportDigest | null {
  if (!compute?.flyingStars) return null

  const fs = compute.flyingStars
  const pattern = pickPrimaryPattern(compute)
  const shaCount = countExteriorSha(compute, options?.visionShaCount)
  const exterior: ReportDigest['exterior'] = {
    shaCount,
    tier: shaCount >= 3 ? 'sha_heavy' : shaCount >= 1 ? 'sha_light' : 'clean',
  }

  const concord: ReportDigest['concord'] = compute.baZhai?.concord
    ? compute.baZhai.concord.concordant
      ? 'matched'
      : 'mismatched'
    : 'unknown'

  const focus = collectFocus(compute)
  const headline = pickHeadline(pattern, focus, exterior, concord)

  return {
    chartLine: {
      sitMountain: fs.sitMountain.name,
      faceMountain: fs.faceMountain.name,
      buildYuan: fs.buildYuanYun.yuanYun,
      currentYuan: fs.currentYuanYun.yuanYun,
      chartMethod: fs.chartMethod,
    },
    pattern,
    concord,
    exterior,
    focus,
    headline,
    confidence,
    inputScore: options?.inputScore,
  }
}

export function patternQualityTone(quality: DigestPattern['quality']): DigestTone {
  if (quality === 'auspicious') return 'accent'
  if (quality === 'inauspicious') return 'danger'
  return 'neutral'
}
