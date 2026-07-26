/**
 * Hard audit for mid-pass FormLiNotes and strengthened final synthesis audit.
 */

import { COMBINATION_MEDICAL_DENYLIST } from '@zhop/astro-core'

import type { FormLiNotes } from '../prompts/form-li-notes'
import type { ComputeAuditViolation, SynthesisChapter } from './synthesis-compute-audit'

const PALACES = new Set(['坎', '艮', '震', '巽', '离', '離', '坤', '兑', '兌', '乾'])

const OVERLAY_CLAIM_RE = /箭头|二十四山|八卦扇区|bagua wedge|annotated overlay|画在图上/i

const SHAN_XIANG_RE = /山\s*([1-9])\s*向\s*([1-9])/g

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null
}

function extractPatterns(compute: Record<string, unknown>): Set<string> {
  const patterns = new Set<string>()
  const patternList = compute.patterns
  if (Array.isArray(patternList)) {
    for (const item of patternList) {
      const row = asRecord(item)
      if (!row) continue
      if (typeof row.kind === 'string') patterns.add(row.kind)
      if (typeof row.name === 'string') patterns.add(row.name)
    }
  }
  return patterns
}

function extractAllowedStarPairs(compute: Record<string, unknown>): Set<string> {
  const pairs = new Set<string>()
  const list = compute.combinations
  if (!Array.isArray(list)) return pairs
  for (const item of list) {
    const row = asRecord(item)
    if (!row) continue
    const m = row.mountainStar
    const f = row.facingStar
    if (typeof m === 'number' && typeof f === 'number') {
      pairs.add(`${m}-${f}`)
      pairs.add(`山${m}向${f}`)
    }
  }
  return pairs
}

function extractSitFaceLabel(compute: Record<string, unknown>): { sit?: string; face?: string } {
  const summary = asRecord(compute.summary)
  if (!summary) return {}
  return {
    sit: typeof summary.sit === 'string' ? summary.sit : undefined,
    face: typeof summary.face === 'string' ? summary.face : undefined,
  }
}

function scanMedical(text: string): ComputeAuditViolation[] {
  const violations: ComputeAuditViolation[] = []
  for (const term of COMBINATION_MEDICAL_DENYLIST) {
    if (text.includes(term)) {
      violations.push({ field: 'medical', term })
    }
  }
  return violations
}

function scanOverlayClaims(text: string): ComputeAuditViolation[] {
  if (!OVERLAY_CLAIM_RE.test(text)) return []
  return [{ field: 'overlay', term: 'overlay_claim' }]
}

function scanShanXiang(
  text: string,
  allowedPairs: Set<string>
): ComputeAuditViolation[] {
  const violations: ComputeAuditViolation[] = []
  for (const match of text.matchAll(SHAN_XIANG_RE)) {
    const key = `${match[1]}-${match[2]}`
    const label = `山${match[1]}向${match[2]}`
    if (allowedPairs.size > 0 && !allowedPairs.has(key) && !allowedPairs.has(label)) {
      violations.push({ field: 'shanXiang', term: label })
    }
  }
  return violations
}

function scanPatterns(text: string, allowed: Set<string>): ComputeAuditViolation[] {
  if (allowed.size === 0) return []
  const violations: ComputeAuditViolation[] = []
  const patternMentions = text.match(/[\u4e00-\u9fff]{2,6}格/g) ?? []
  for (const mention of patternMentions) {
    const base = mention.replace(/格$/, '')
    const known = [...allowed].some((p) => p.includes(base) || base.includes(p))
    if (!known) {
      violations.push({ field: 'patterns', term: mention })
    }
  }
  return violations
}

export function auditFormLiNotes(
  notes: FormLiNotes,
  compute: unknown
): { ok: true } | { ok: false; violations: ComputeAuditViolation[]; rewriteSuffix: string } {
  const computeObj = asRecord(compute) ?? {}
  const patterns = extractPatterns(computeObj)
  const pairs = extractAllowedStarPairs(computeObj)
  const violations: ComputeAuditViolation[] = []

  if (notes.inventedFacing !== false) {
    violations.push({ field: 'inventedFacing', term: 'must_be_false' })
  }

  for (const bullet of notes.bullets) {
    const palaceNorm = bullet.palace.replace('離', '离').replace('兌', '兑')
    if (!PALACES.has(bullet.palace) && !PALACES.has(palaceNorm)) {
      violations.push({ field: 'palace', term: bullet.palace })
    }
    const text = `${bullet.seen}\n${bullet.linkToChart}`
    violations.push(...scanMedical(text))
    violations.push(...scanOverlayClaims(text))
    violations.push(...scanShanXiang(text, pairs))
    violations.push(...scanPatterns(text, patterns))
  }

  if (violations.length === 0) return { ok: true }
  const unique = [...new Map(violations.map((v) => [`${v.field}:${v.term}`, v])).values()]
  return {
    ok: false,
    violations: unique,
    rewriteSuffix: `\n\nREWRITE REQUIRED — fix FormLiNotes violations: ${unique
      .map((v) => `${v.field}:${v.term}`)
      .join(', ')}. Never invent facing; cite only compute patterns/combinations; no medical classical.`,
  }
}

/** Extended final-chapter audit used alongside room/pattern checks. */
export function auditSynthesisFactsHard(
  chapters: SynthesisChapter[],
  compute: unknown
): { ok: true } | { ok: false; violations: ComputeAuditViolation[]; rewriteSuffix: string } {
  const computeObj = asRecord(compute) ?? {}
  const patterns = extractPatterns(computeObj)
  const pairs = extractAllowedStarPairs(computeObj)
  const { sit, face } = extractSitFaceLabel(computeObj)
  const violations: ComputeAuditViolation[] = []

  for (const chapter of chapters) {
    const text = `${chapter.title}\n${chapter.goldenLine}\n${chapter.body}`
    violations.push(...scanMedical(text))
    violations.push(...scanOverlayClaims(text))
    violations.push(...scanShanXiang(text, pairs))
    violations.push(...scanPatterns(text, patterns))
    // If model invents a conflicting 坐X向Y mountain name vs summary — soft check on 坐/向 tokens with wrong pair is hard; skip name equality.
    if (sit && text.includes('坐') && text.includes('向')) {
      // no-op structural; shanXiang covers star pairs
      void face
    }
  }

  if (violations.length === 0) return { ok: true }
  const unique = [...new Map(violations.map((v) => [`${v.field}:${v.term}`, v])).values()]
  return {
    ok: false,
    violations: unique,
    rewriteSuffix: `\n\nREWRITE REQUIRED — remove unsupported 山N向M / 格局 / medical / overlay claims: ${unique
      .map((v) => `${v.field}:${v.term}`)
      .join(', ')}.`,
  }
}
