/**
 * Vision geometry post-audit — downgrade VLM claims that conflict with DEM / prefetch / roads.
 */

import type { BaguaPalace } from './twenty-four-mountains'
import { palaceAtDegree } from './twenty-four-mountains'

export type GeometrySupport = 'strong' | 'weak' | 'none' | 'inferred-only'

export interface VisionShaFinding {
  type: string
  direction: string
  distance: 'near' | 'mid' | 'far'
  severity: number
  evidence: string
  confidence?: 'high' | 'low'
  geometrySupport?: GeometrySupport
  adjustedSeverity?: number
}

export interface VisionSandFinding {
  type: string
  direction: string
  distance: 'near' | 'mid' | 'far'
  strength: 'strong' | 'medium' | 'weak'
  confidence?: 'high' | 'low'
  geometrySupport?: GeometrySupport
}

export interface VisionWaterFinding {
  type: string
  direction: string
  distance: 'near' | 'mid' | 'far'
  flow: 'in' | 'out' | 'still'
  confidence?: 'high' | 'low'
  geometrySupport?: GeometrySupport
}

export interface VisionCourtFinding {
  type: string
  direction: string
  distance: 'near' | 'mid' | 'far'
  confidence?: 'high' | 'low'
  geometrySupport?: GeometrySupport
}

export interface RawVisionFindings {
  形煞: VisionShaFinding[]
  砂: VisionSandFinding[]
  水: VisionWaterFinding[]
  朝案: VisionCourtFinding[]
  notes?: string
}

export interface VisionGeometryContext {
  hasWater: boolean
  hasMountain: boolean
  flatUrban: boolean
  nearestRoadBearingDeg: number | null
  closeTileRendered: boolean
}

export interface PalaceElevation {
  relativeM?: number
  isMountain?: boolean
}

const PALACE_CENTER_DEG: Record<BaguaPalace, number> = {
  坎: 0,
  艮: 45,
  震: 90,
  巽: 135,
  离: 180,
  坤: 225,
  兑: 270,
  乾: 315,
}

const PALACE_CHARS: Record<string, BaguaPalace> = {
  乾: '乾',
  兑: '兑',
  兌: '兑',
  离: '离',
  離: '离',
  震: '震',
  巽: '巽',
  坎: '坎',
  艮: '艮',
  坤: '坤',
}

function directionToPalace(dir: string): BaguaPalace | null {
  for (const ch of dir) {
    const p = PALACE_CHARS[ch]
    if (p) return p
  }
  return null
}

function normDeg(deg: number): number {
  return ((deg % 360) + 360) % 360
}

function angleDelta(a: number, b: number): number {
  const d = Math.abs(normDeg(a - b))
  return Math.min(d, 360 - d)
}

function capSeverity(sev: number, cap: number): number {
  return Math.min(cap, Math.max(1, sev))
}

function isRoadShaType(type: string): boolean {
  return type.includes('路冲') || type.includes('反弓')
}

function isBackingSand(type: string): boolean {
  return type.includes('后靠') || type.includes('案山')
}

function isRiverOrPond(type: string): boolean {
  return type.includes('河') || type.includes('池塘')
}

export function auditVisionGeometry(
  vision: RawVisionFindings,
  ctx: VisionGeometryContext,
  elevationByPalace?: Partial<Record<BaguaPalace, PalaceElevation>>
): RawVisionFindings {
  const 形煞 = vision.形煞.map((item) => auditSha(item, ctx))
  const 砂 = vision.砂.map((item) => auditSand(item, ctx, elevationByPalace))
  const 水 = vision.水.map((item) => auditWater(item, ctx))
  const 朝案 = vision.朝案.map((item) => ({
    ...item,
    geometrySupport: item.geometrySupport ?? ('strong' as GeometrySupport),
  }))
  return { ...vision, 形煞, 砂, 水, 朝案 }
}

function auditSha(item: VisionShaFinding, ctx: VisionGeometryContext): VisionShaFinding {
  let geometrySupport: GeometrySupport = 'strong'
  let adjustedSeverity = item.severity

  if (item.confidence === 'low') {
    adjustedSeverity = capSeverity(adjustedSeverity, 2)
    geometrySupport = 'inferred-only'
  }

  if (item.distance === 'near' && !ctx.closeTileRendered) {
    adjustedSeverity = capSeverity(adjustedSeverity, 3)
    if (geometrySupport === 'strong') geometrySupport = 'weak'
  }

  if (isRoadShaType(item.type) && ctx.nearestRoadBearingDeg != null) {
    const palace = directionToPalace(item.direction)
    if (palace) {
      const claimed = PALACE_CENTER_DEG[palace]
      const roadDelta = angleDelta(ctx.nearestRoadBearingDeg, claimed)
      if (roadDelta > 45) {
        geometrySupport = 'none'
        adjustedSeverity = Math.min(adjustedSeverity, 1)
      }
    }
  }

  return { ...item, geometrySupport, adjustedSeverity }
}

function auditSand(
  item: VisionSandFinding,
  ctx: VisionGeometryContext,
  elevationByPalace?: Partial<Record<BaguaPalace, PalaceElevation>>
): VisionSandFinding {
  let geometrySupport: GeometrySupport = 'strong'
  let strength = item.strength
  const palace = directionToPalace(item.direction)

  if (palace && elevationByPalace && isBackingSand(item.type)) {
    const elev = elevationByPalace[palace]
    if (elev && !elev.isMountain && (elev.relativeM ?? 0) <= 0) {
      geometrySupport = 'weak'
      if (strength === 'strong') strength = 'medium'
      else if (strength === 'medium') strength = 'weak'
    }
  }

  if (item.confidence === 'low' || (ctx.flatUrban && !ctx.hasMountain)) {
    if (strength === 'strong') strength = 'medium'
    geometrySupport = geometrySupport === 'strong' ? 'inferred-only' : geometrySupport
  }

  return { ...item, strength, geometrySupport }
}

function auditWater(item: VisionWaterFinding, ctx: VisionGeometryContext): VisionWaterFinding {
  let geometrySupport: GeometrySupport = 'strong'

  if (!ctx.hasWater && isRiverOrPond(item.type)) {
    geometrySupport = 'inferred-only'
  }

  if (item.confidence === 'low' || (ctx.flatUrban && !ctx.hasWater)) {
    geometrySupport = geometrySupport === 'strong' ? 'inferred-only' : geometrySupport
  }

  return { ...item, geometrySupport }
}

export function shaCountsForFormLi(findings: VisionShaFinding[], threshold = 2): boolean {
  return findings.some((f) => (f.adjustedSeverity ?? f.severity) >= threshold)
}

export { directionToPalace }
