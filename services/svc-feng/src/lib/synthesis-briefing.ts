/**
 * Compact synthesis briefing — never dump full vision/compute JSON.
 * Hard cap: serialized briefing ≤ 12_000 characters (plan §5.2).
 */

export const SYNTHESIS_BRIEFING_MAX_CHARS = 12_000

type UnknownRecord = Record<string, unknown>

function asRecord(v: unknown): UnknownRecord | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as UnknownRecord) : null
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

function summarizeVisionFindings(list: unknown, limit: number): unknown[] {
  if (!Array.isArray(list)) return []
  return list.slice(0, limit).map((item) => {
    const row = asRecord(item)
    if (!row) return item
    return {
      type: row.type,
      direction: row.direction,
      distance: row.distance,
      severity: row.severity,
      strength: row.strength,
      flow: row.flow,
      confidence: row.confidence,
      evidence: typeof row.evidence === 'string' ? truncate(row.evidence, 80) : undefined,
      geometrySupport: row.geometrySupport,
    }
  })
}

function priorityCombinations(combinations: unknown): unknown[] {
  if (!Array.isArray(combinations)) return []
  const scored = combinations
    .map((item) => {
      const row = asRecord(item)
      if (!row) return null
      const domain = row.domain
      const domains = Array.isArray(domain) ? domain.map(String) : []
      const malefic = domains.some((d) => ['病', '灾', '是非', '盗'].includes(d))
      const score = malefic ? 3 : row.name ? 2 : row.readingPublic || row.reading ? 1 : 0
      return {
        score,
        value: {
          palace: row.palace,
          mountainStar: row.mountainStar,
          facingStar: row.facingStar,
          phase: row.phase,
          name: row.name,
          domain: row.domain,
          // Public only — never classical medical `reading`
          readingPublic: row.readingPublic ?? null,
        },
      }
    })
    .filter((x): x is NonNullable<typeof x> => x != null && x.score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, 6).map((s) => s.value)
}

function formLiTop(formLi: unknown, n: number): unknown {
  const row = asRecord(formLi)
  if (!row) return null
  const palaces = Array.isArray(row.palaces) ? row.palaces.slice(0, n) : []
  return {
    palaces,
    zhengLing: row.zhengLing ?? null,
    patternRescue: row.patternRescue ?? null,
  }
}

function baZhaiCompact(baZhai: unknown): unknown {
  const row = asRecord(baZhai)
  if (!row) return null
  return {
    concord: row.concord ?? null,
    placement: row.placement ?? null,
    house: row.house ? { gua: asRecord(row.house)?.gua, name: asRecord(row.house)?.name } : null,
    person: row.person
      ? { gua: asRecord(row.person)?.gua, name: asRecord(row.person)?.name }
      : null,
  }
}

function roomFindingsCompact(rooms: unknown): unknown[] {
  if (!Array.isArray(rooms)) return []
  return rooms
    .filter((item) => {
      const row = asRecord(item)
      return row?.priority === 'high' || row?.roomType === '大门' || row?.roomType === '主卧'
    })
    .slice(0, 8)
    .map((item) => {
      const row = asRecord(item)!
      return {
        roomType: row.roomType,
        palace: row.palace,
        governing: row.governing,
        conflict: row.conflict,
        mingBaZhai: row.mingBaZhai ?? row.baZhai,
        zhaiBaZhai: row.zhaiBaZhai,
        phase: row.phase,
        name: row.name,
        readingPublic: row.readingPublic ?? null,
        sha: row.sha,
        floorLabel: row.floorLabel,
      }
    })
}

export interface SynthesisBriefingInput {
  vision: unknown
  compute: unknown
  dataQuality?: {
    flyingStarsConfidence?: string
    notes?: string[]
    hasExactBuildYear?: boolean
    inputScore?: number
  }
  formLiNotes?: unknown | null
  mustSoften?: unknown[]
  memoryContext?: string
  userProfile: { birthDate: string; gender: string; locale: string }
}

/**
 * Build a lean briefing object for the final chapter LLM.
 * Guarantees no full nine-palace raw flying-star charts.
 */
export function buildSynthesisBriefing(input: SynthesisBriefingInput): UnknownRecord {
  const vision = asRecord(input.vision) ?? {}
  const compute = asRecord(input.compute) ?? {}

  const briefing: UnknownRecord = {
    schemaVersion: 1,
    userProfile: input.userProfile,
    dataQuality: input.dataQuality
      ? {
          flyingStarsConfidence: input.dataQuality.flyingStarsConfidence,
          notes: input.dataQuality.notes ?? [],
          hasExactBuildYear: input.dataQuality.hasExactBuildYear,
          inputScore: input.dataQuality.inputScore,
        }
      : undefined,
    summary: compute.summary ?? null,
    patterns: Array.isArray(compute.patterns) ? compute.patterns : [],
    combinationsPriority: priorityCombinations(compute.combinations),
    formLi: formLiTop(compute.formLi, 6),
    baZhai: baZhaiCompact(compute.baZhai),
    auspiciousPalaces: compute.auspiciousPalaces ?? [],
    inauspiciousPalaces: compute.inauspiciousPalaces ?? [],
    macroTerrain: compute.macroTerrain ?? null,
    monthlyStars: compute.monthlyStars
      ? {
          lunarMonth: asRecord(compute.monthlyStars)?.lunarMonth,
        }
      : null,
    roomFindingsPriority: roomFindingsCompact(compute.roomFindings),
    interiorSha: Array.isArray(compute.interiorSha) ? compute.interiorSha.slice(0, 6) : [],
    interiorQueJiao: Array.isArray(compute.interiorQueJiao)
      ? compute.interiorQueJiao.slice(0, 4)
      : [],
    visionSummary: {
      形煞: summarizeVisionFindings(vision.形煞, 8),
      砂: summarizeVisionFindings(vision.砂, 6),
      水: summarizeVisionFindings(vision.水, 6),
      朝案: summarizeVisionFindings(vision.朝案, 4),
      notes: typeof vision.notes === 'string' ? truncate(vision.notes, 200) : undefined,
    },
    formLiNotes: input.formLiNotes ?? null,
    mustSoften: input.mustSoften?.length ? input.mustSoften : undefined,
    memoryContext: input.memoryContext ? truncate(input.memoryContext, 1500) : undefined,
  }

  // Explicitly omit full flyingStars / annualChart dumps
  let json = JSON.stringify(briefing)
  if (json.length > SYNTHESIS_BRIEFING_MAX_CHARS) {
    // Drop memory first, then trim vision evidence
    delete briefing.memoryContext
    const vs = asRecord(briefing.visionSummary)
    if (vs) {
      vs.形煞 = Array.isArray(vs.形煞) ? vs.形煞.slice(0, 4) : []
      vs.砂 = Array.isArray(vs.砂) ? vs.砂.slice(0, 3) : []
      vs.水 = Array.isArray(vs.水) ? vs.水.slice(0, 3) : []
    }
    json = JSON.stringify(briefing)
  }
  if (json.length > SYNTHESIS_BRIEFING_MAX_CHARS) {
    briefing.formLiNotes = null
  }

  return briefing
}

export function serializeSynthesisBriefing(briefing: UnknownRecord): string {
  const json = JSON.stringify(briefing, null, 2)
  if (json.length <= SYNTHESIS_BRIEFING_MAX_CHARS) return json
  return json.slice(0, SYNTHESIS_BRIEFING_MAX_CHARS)
}

export function briefingContainsRawChartDump(serialized: string): boolean {
  return (
    serialized.includes('"mountainChart"') ||
    serialized.includes('"facingChart"') ||
    serialized.includes('"periodChart"') ||
    serialized.includes('"annualChart"')
  )
}
