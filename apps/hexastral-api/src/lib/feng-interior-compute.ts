/**
 * Interior room ↔ palace join (deterministic, in-process).
 *
 * The interior vision returns rooms localized into 八卦九宫 (given the stated
 * north). This joins each room with the already-computed per-palace data:
 *   - 玄空飞星 山向 combination (phase / name / reading) for that palace
 *   - 八宅 命卦 + 宅卦双轨 verdict for that palace
 *   - any interior 形煞 the vision flagged in that palace
 *
 * It does NOT re-derive stars — it only correlates, so the LLM synthesis can
 * write room-specific advice ("主卧在坤宫、二黑临…") instead of generic palace talk.
 */

import {
  houseDirections,
  isHighPriorityRoom,
  resolveRoomBaZhaiDualTrack,
  type BaguaPalace,
  type DirectionVerdict,
  type ZhaiMingConcord,
} from '@zhop/astro-core'
import type { InteriorVisionResult } from './feng-client'

export interface RoomFinding {
  floorLabel?: string
  roomType: string
  palace: string
  /** @deprecated Use mingBaZhai — kept for backward compatibility (= mingBaZhai). */
  baZhai: 'lucky' | 'unlucky' | 'neutral'
  mingBaZhai: 'lucky' | 'unlucky' | 'neutral'
  zhaiBaZhai: 'lucky' | 'unlucky' | 'neutral'
  mingKind: string | null
  zhaiKind: string | null
  governing: '命' | '宅' | '一致'
  conflict: boolean
  priority?: 'high'
  starPhase: string | null
  starName: string | null
  starReading: string | null
  sha: Array<{ type: string; severity: number; evidence: string }>
  note?: string
}

interface Combination {
  palace: string
  phase: string
  name: string | null
  reading: string | null
}

export function deriveRoomFindings(
  interior: InteriorVisionResult,
  ctx: {
    combinations: Combination[]
    sitPalace: BaguaPalace
    mingLucky: DirectionVerdict[]
    mingUnlucky: DirectionVerdict[]
    concord?: ZhaiMingConcord
    floorLabels?: (string | undefined)[]
  }
): RoomFinding[] {
  const comboByPalace = new Map(ctx.combinations.map((c) => [c.palace, c]))
  const house = houseDirections(ctx.sitPalace)

  const findings: RoomFinding[] = []
  for (const [i, floor] of interior.floors.entries()) {
    const floorLabel = ctx.floorLabels?.[i]
    const shaByPalace = new Map<
      string,
      Array<{ type: string; severity: number; evidence: string }>
    >()
    for (const s of floor.形煞) {
      const list = shaByPalace.get(s.palace) ?? []
      list.push({ type: s.type, severity: s.severity, evidence: s.evidence })
      shaByPalace.set(s.palace, list)
    }

    for (const room of floor.rooms) {
      const palace = room.palace as BaguaPalace
      const combo = comboByPalace.get(room.palace)
      const dual = ctx.concord
        ? resolveRoomBaZhaiDualTrack(
            palace,
            { lucky: ctx.mingLucky, unlucky: ctx.mingUnlucky },
            house,
            ctx.concord
          )
        : (() => {
            const zhaiSide = house.lucky.some((d) => d.palace === palace)
              ? { verdict: 'lucky' as const, kind: house.lucky.find((d) => d.palace === palace)?.kind ?? null }
              : house.unlucky.some((d) => d.palace === palace)
                ? {
                    verdict: 'unlucky' as const,
                    kind: house.unlucky.find((d) => d.palace === palace)?.kind ?? null,
                  }
                : { verdict: 'neutral' as const, kind: null }
            return {
              mingBaZhai: 'neutral' as const,
              zhaiBaZhai: zhaiSide.verdict,
              mingKind: null,
              zhaiKind: zhaiSide.kind,
              governing: '宅' as const,
              conflict: false,
            }
          })()
      findings.push({
        ...(floorLabel ? { floorLabel } : {}),
        roomType: room.type,
        palace: room.palace,
        baZhai: dual.mingBaZhai,
        mingBaZhai: dual.mingBaZhai,
        zhaiBaZhai: dual.zhaiBaZhai,
        mingKind: dual.mingKind,
        zhaiKind: dual.zhaiKind,
        governing: dual.governing,
        conflict: dual.conflict,
        ...(isHighPriorityRoom(room.type) ? { priority: 'high' as const } : {}),
        starPhase: combo?.phase ?? null,
        starName: combo?.name ?? null,
        starReading: combo?.reading ?? null,
        sha: shaByPalace.get(room.palace) ?? [],
        ...(room.note ? { note: room.note } : {}),
      })
    }
  }
  return findings
}

/**
 * All FLOORPLAN_CACHE keys a site owns (cover `floorplanKey` + every image in
 * `floorplanJson`), deduped. Used to purge the images from R2 on site/account
 * deletion — the bucket has no lifecycle GC, so this is the only cleanup path.
 */
export function collectFloorplanKeys(site: {
  floorplanKey: string | null
  floorplanJson: string | null
}): string[] {
  const keys = new Set<string>()
  if (site.floorplanKey) keys.add(site.floorplanKey)
  const parsed = parseSiteFloorplan(site.floorplanJson)
  if (parsed) for (const im of parsed.images) keys.add(im.key)
  return [...keys]
}

export interface ParsedSiteFloorplan {
  orientDeg: number
  images: Array<{ key: string; label?: string }>
  /** Normalized 中宫 (0–1) on the cover plan — user-placed 立极. */
  centerNorm?: { x: number; y: number }
}

/** Safe-parse the site's stored floorplan JSON into its typed shape (or null). */
export function parseSiteFloorplan(json: string | null): ParsedSiteFloorplan | null {
  if (!json) return null
  try {
    const parsed: unknown = JSON.parse(json)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('orientDeg' in parsed) ||
      !('images' in parsed)
    ) {
      return null
    }
    const orientDeg = (parsed as { orientDeg: unknown }).orientDeg
    const imagesRaw = (parsed as { images: unknown }).images
    if (typeof orientDeg !== 'number' || !Array.isArray(imagesRaw)) return null
    const images: Array<{ key: string; label?: string }> = []
    for (const im of imagesRaw) {
      if (typeof im === 'object' && im !== null && 'key' in im) {
        const key = (im as { key: unknown }).key
        const label = (im as { label?: unknown }).label
        if (typeof key === 'string' && key.length > 0) {
          images.push(typeof label === 'string' ? { key, label } : { key })
        }
      }
    }
    if (images.length === 0) return null
    const out: ParsedSiteFloorplan = { orientDeg, images }
    if ('centerNorm' in parsed) {
      const cn = (parsed as { centerNorm: unknown }).centerNorm
      if (
        typeof cn === 'object' &&
        cn !== null &&
        'x' in cn &&
        'y' in cn &&
        typeof (cn as { x: unknown }).x === 'number' &&
        typeof (cn as { y: unknown }).y === 'number'
      ) {
        const x = (cn as { x: number }).x
        const y = (cn as { y: number }).y
        if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
          out.centerNorm = { x, y }
        }
      }
    }
    return out
  } catch {
    return null
  }
}
