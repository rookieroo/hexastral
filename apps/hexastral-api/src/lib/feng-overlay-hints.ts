/**
 * Derive overlayHints + typed macroTerrain from vision / DEM / formAzimuths.
 * Display-only for client SVG — never baked into Vision tiles.
 */

export type OverlaySeverity = 'info' | 'watch' | 'risk'

export interface OverlayHintItem {
  palace: string
  bearingDeg: number
  label: string
  severity?: OverlaySeverity
}

export interface OverlayHints {
  formSha: OverlayHintItem[]
  water: OverlayHintItem[]
  sand: Array<{ palace: string; label: string }>
  shuiKou: { palace: string; label: string } | null
}

export interface MacroTerrainTyped {
  laiLong: string | null
  shuiKou: string | null
  waterByPalace: Record<string, { bearingDeg: number; distanceM: number; kind: string }>
  sandByPalace: Record<string, { relativeM: number; isMountain: boolean }>
  roadAsVirtualWater: string[]
  byPalace?: unknown
}

type FormAzimuth = {
  kind?: string
  palace?: string
  bearingDeg?: number
  distanceM?: number
}

type ElevationLike = {
  laiLong?: string | null
  degraded?: boolean
  byPalace?: Record<string, { ele?: number | null; relativeM?: number; isMountain?: boolean }>
}

const PALACE_BEARINGS: Record<string, number> = {
  坎: 0,
  艮: 45,
  震: 90,
  巽: 135,
  离: 180,
  離: 180,
  坤: 225,
  兑: 270,
  兌: 270,
  乾: 315,
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function severityFromSha(sev: unknown): OverlaySeverity {
  if (typeof sev === 'number') {
    if (sev >= 4) return 'risk'
    if (sev >= 2) return 'watch'
  }
  return 'info'
}

/**
 * Water mouth: lowest relative elevation palace that also has Tilequery water.
 * Fail-open → null when no intersection.
 */
export function deriveShuiKou(
  elevation: ElevationLike | null | undefined,
  formAzimuths: FormAzimuth[] | undefined
): string | null {
  if (!elevation || elevation.degraded || !elevation.byPalace) return null
  const waterPalaces = new Set(
    (formAzimuths ?? [])
      .filter((a) => a.kind === 'water' || a.kind === 'waterway')
      .map((a) => a.palace)
      .filter((p): p is string => typeof p === 'string')
  )
  if (waterPalaces.size === 0) return null

  let best: { palace: string; relativeM: number } | null = null
  for (const [palace, row] of Object.entries(elevation.byPalace)) {
    if (!waterPalaces.has(palace)) continue
    const rel = typeof row.relativeM === 'number' ? row.relativeM : 0
    if (!best || rel < best.relativeM) best = { palace, relativeM: rel }
  }
  return best?.palace ?? null
}

export function buildMacroTerrainTyped(opts: {
  elevation: ElevationLike | null | undefined
  formAzimuths: FormAzimuth[] | undefined
}): MacroTerrainTyped {
  const { elevation, formAzimuths } = opts
  const waterByPalace: MacroTerrainTyped['waterByPalace'] = {}
  const roadAsVirtualWater: string[] = []

  for (const az of formAzimuths ?? []) {
    if (typeof az.palace !== 'string') continue
    if (az.kind === 'water' || az.kind === 'waterway') {
      const prev = waterByPalace[az.palace]
      const dist = typeof az.distanceM === 'number' ? az.distanceM : 9999
      if (!prev || dist < prev.distanceM) {
        waterByPalace[az.palace] = {
          bearingDeg: typeof az.bearingDeg === 'number' ? az.bearingDeg : PALACE_BEARINGS[az.palace] ?? 0,
          distanceM: dist,
          kind: az.kind,
        }
      }
    }
    if (az.kind === 'road') {
      roadAsVirtualWater.push(az.palace)
    }
  }

  const sandByPalace: MacroTerrainTyped['sandByPalace'] = {}
  if (elevation?.byPalace && !elevation.degraded) {
    for (const [palace, row] of Object.entries(elevation.byPalace)) {
      sandByPalace[palace] = {
        relativeM: typeof row.relativeM === 'number' ? row.relativeM : 0,
        isMountain: row.isMountain === true,
      }
    }
  }

  const shuiKou = deriveShuiKou(elevation, formAzimuths)

  return {
    laiLong: elevation && !elevation.degraded ? (elevation.laiLong ?? null) : null,
    shuiKou,
    waterByPalace,
    sandByPalace,
    roadAsVirtualWater: [...new Set(roadAsVirtualWater)],
    byPalace: elevation?.byPalace,
  }
}

export function buildOverlayHints(opts: {
  vision: { 形煞?: unknown[]; 水?: unknown[]; 砂?: unknown[] } | null | undefined
  formAzimuths: FormAzimuth[] | undefined
  macro: MacroTerrainTyped
}): OverlayHints {
  const formSha: OverlayHintItem[] = []
  const water: OverlayHintItem[] = []
  const sand: OverlayHints['sand'] = []

  for (const item of opts.vision?.形煞 ?? []) {
    const row = asRecord(item)
    if (!row) continue
    const palace = typeof row.direction === 'string' ? row.direction : null
    if (!palace) continue
    const type = typeof row.type === 'string' ? row.type : '形煞'
    formSha.push({
      palace,
      bearingDeg: PALACE_BEARINGS[palace] ?? 0,
      label: type,
      severity: severityFromSha(row.severity),
    })
  }

  for (const [palace, row] of Object.entries(opts.macro.waterByPalace)) {
    water.push({
      palace,
      bearingDeg: row.bearingDeg,
      label: row.kind === 'waterway' ? '水' : '水',
    })
  }

  // Prefer Tilequery bearings when available for water from vision too
  for (const item of opts.vision?.水 ?? []) {
    const row = asRecord(item)
    if (!row) continue
    const palace = typeof row.direction === 'string' ? row.direction : null
    if (!palace) continue
    if (water.some((w) => w.palace === palace)) continue
    const type = typeof row.type === 'string' ? row.type : '水'
    water.push({
      palace,
      bearingDeg: PALACE_BEARINGS[palace] ?? 0,
      label: type,
    })
  }

  for (const [palace, row] of Object.entries(opts.macro.sandByPalace)) {
    if (!row.isMountain) continue
    const isLai = opts.macro.laiLong === palace
    sand.push({ palace, label: isLai ? '来龙' : '砂' })
  }

  const shuiKou =
    opts.macro.shuiKou != null
      ? { palace: opts.macro.shuiKou, label: '水口' }
      : null

  return {
    formSha: formSha.slice(0, 8),
    water: water.slice(0, 8),
    sand: sand.slice(0, 8),
    shuiKou,
  }
}
