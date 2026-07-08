/**
 * Post-synthesis audit — reject chapter text that cites compute facts not in the payload.
 */

export interface SynthesisChapter {
  kind: string
  title: string
  goldenLine: string
  body: string
}

export interface ComputeAuditViolation {
  field: string
  term: string
}

const COMMON_ROOM_TYPES = [
  '主卧',
  '次卧',
  '客厅',
  '餐厅',
  '厨房',
  '卫生间',
  '书房',
  '阳台',
  '玄关',
  '储物间',
  '儿童房',
  '老人房',
]

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null
}

function extractAllowedTerms(compute: Record<string, unknown>): {
  patterns: Set<string>
  rooms: Set<string>
} {
  const patterns = new Set<string>()
  const rooms = new Set<string>()

  const patternList = compute.patterns
  if (Array.isArray(patternList)) {
    for (const item of patternList) {
      const row = asRecord(item)
      if (!row) continue
      if (typeof row.kind === 'string') patterns.add(row.kind)
      if (typeof row.name === 'string') patterns.add(row.name)
    }
  }

  const roomList = compute.roomFindings
  if (Array.isArray(roomList)) {
    for (const item of roomList) {
      const row = asRecord(item)
      if (!row) continue
      if (typeof row.roomType === 'string') rooms.add(row.roomType)
    }
  }

  return { patterns, rooms }
}

function scanUnknownRooms(text: string, allowed: Set<string>): ComputeAuditViolation[] {
  if (allowed.size === 0) return []
  const violations: ComputeAuditViolation[] = []
  for (const room of COMMON_ROOM_TYPES) {
    if (!text.includes(room)) continue
    if (!allowed.has(room)) {
      violations.push({ field: 'roomFindings', term: room })
    }
  }
  return violations
}

function scanUnknownPatterns(text: string, allowed: Set<string>): ComputeAuditViolation[] {
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

export function auditSynthesisAgainstCompute(
  chapters: SynthesisChapter[],
  compute: unknown
): { ok: true } | { ok: false; violations: ComputeAuditViolation[]; rewriteSuffix: string } {
  const computeObj = asRecord(compute) ?? {}
  const { patterns, rooms } = extractAllowedTerms(computeObj)
  const violations: ComputeAuditViolation[] = []

  for (const chapter of chapters) {
    const text = `${chapter.title}\n${chapter.goldenLine}\n${chapter.body}`
    violations.push(...scanUnknownRooms(text, rooms))
    violations.push(...scanUnknownPatterns(text, patterns))
  }

  if (violations.length === 0) return { ok: true }

  const unique = [...new Map(violations.map((v) => [`${v.field}:${v.term}`, v])).values()]
  const rewriteSuffix = `\n\nREWRITE REQUIRED — remove or soften terms not supported by compute JSON: ${unique
    .map((v) => `${v.field}:${v.term}`)
    .join(', ')}. Cite only rooms from roomFindings and patterns from patterns[].`
  return { ok: false, violations: unique, rewriteSuffix }
}
