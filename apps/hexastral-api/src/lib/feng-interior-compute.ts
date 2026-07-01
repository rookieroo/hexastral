/**
 * Interior room ↔ palace join (deterministic, in-process).
 *
 * The interior vision returns rooms localized into 八卦九宫 (given the stated
 * north). This joins each room with the already-computed per-palace data:
 *   - 玄空飞星 山向 combination (phase / name / reading) for that palace
 *   - 八宅 auspicious / inauspicious verdict for that palace
 *   - any interior 形煞 the vision flagged in that palace
 *
 * It does NOT re-derive stars — it only correlates, so the LLM synthesis can
 * write room-specific advice ("主卧在坤宫、二黑临…") instead of generic palace talk.
 */

import type { InteriorVisionResult } from './feng-client'

export interface RoomFinding {
  floorLabel?: string
  roomType: string
  palace: string
  /** 八宅 verdict for the room's palace. */
  baZhai: 'lucky' | 'unlucky' | 'neutral'
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
    auspiciousPalaces: string[]
    inauspiciousPalaces: string[]
    floorLabels?: (string | undefined)[]
  }
): RoomFinding[] {
  const comboByPalace = new Map(ctx.combinations.map((c) => [c.palace, c]))
  const auspicious = new Set(ctx.auspiciousPalaces)
  const inauspicious = new Set(ctx.inauspiciousPalaces)

  const findings: RoomFinding[] = []
  for (const [i, floor] of interior.floors.entries()) {
    const floorLabel = ctx.floorLabels?.[i]
    // Group this floor's interior 形煞 by palace for O(1) attach.
    const shaByPalace = new Map<string, Array<{ type: string; severity: number; evidence: string }>>()
    for (const s of floor.形煞) {
      const list = shaByPalace.get(s.palace) ?? []
      list.push({ type: s.type, severity: s.severity, evidence: s.evidence })
      shaByPalace.set(s.palace, list)
    }

    for (const room of floor.rooms) {
      const combo = comboByPalace.get(room.palace)
      const baZhai: RoomFinding['baZhai'] = auspicious.has(room.palace)
        ? 'lucky'
        : inauspicious.has(room.palace)
          ? 'unlucky'
          : 'neutral'
      findings.push({
        ...(floorLabel ? { floorLabel } : {}),
        roomType: room.type,
        palace: room.palace,
        baZhai,
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

/** Safe-parse the site's stored floorplan JSON into its typed shape (or null). */
export function parseSiteFloorplan(
  json: string | null
): { orientDeg: number; images: Array<{ key: string; label?: string }> } | null {
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
    return { orientDeg, images }
  } catch {
    return null
  }
}
