/**
 * 宅卦 + 命卦双轨 — per-room 八宅 verdict for interior join.
 *
 * Classical rule: when 宅命不配, 以人为本 — 门床灶取命卦吉方 (see zhaiMingConcord).
 */

import type {
  DirectionVerdict,
  HouseDirections,
  ZhaiMingConcord,
} from './ba-zhai'
import type { BaguaPalace } from './twenty-four-mountains'

export type BaZhaiVerdict = 'lucky' | 'unlucky' | 'neutral'

export type RoomBaZhaiGoverning = '命' | '宅' | '一致'

export interface RoomBaZhaiDualTrack {
  mingBaZhai: BaZhaiVerdict
  zhaiBaZhai: BaZhaiVerdict
  mingKind: string | null
  zhaiKind: string | null
  governing: RoomBaZhaiGoverning
  conflict: boolean
}

const HIGH_PRIORITY_ROOM_TYPES = new Set(['大门', '主卧', '灶位', '厨房'])

export function isHighPriorityRoom(roomType: string): boolean {
  return HIGH_PRIORITY_ROOM_TYPES.has(roomType)
}

function verdictForPalace(
  palace: BaguaPalace,
  lucky: readonly DirectionVerdict[],
  unlucky: readonly DirectionVerdict[]
): { verdict: BaZhaiVerdict; kind: string | null } {
  const luckyHit = lucky.find((d) => d.palace === palace)
  if (luckyHit) return { verdict: 'lucky', kind: luckyHit.kind }
  const unluckyHit = unlucky.find((d) => d.palace === palace)
  if (unluckyHit) return { verdict: 'unlucky', kind: unluckyHit.kind }
  return { verdict: 'neutral', kind: null }
}

/** Dual-track 八宅 verdict for one room palace (命卦 vs 宅卦游年). */
export function resolveRoomBaZhaiDualTrack(
  palace: BaguaPalace,
  ming: { lucky: readonly DirectionVerdict[]; unlucky: readonly DirectionVerdict[] },
  house: HouseDirections,
  concord: ZhaiMingConcord
): RoomBaZhaiDualTrack {
  const mingSide = verdictForPalace(palace, ming.lucky, ming.unlucky)
  const zhaiSide = verdictForPalace(palace, house.lucky, house.unlucky)
  const conflict = mingSide.verdict !== zhaiSide.verdict

  let governing: RoomBaZhaiGoverning
  if (concord.concordant && !conflict) {
    governing = '一致'
  } else if (!concord.concordant) {
    governing = '命'
  } else {
    // 相配但同宫吉凶分歧 — 仍以命卦为主导（宅命同组，具体宫可微调）
    governing = '命'
  }

  return {
    mingBaZhai: mingSide.verdict,
    zhaiBaZhai: zhaiSide.verdict,
    mingKind: mingSide.kind,
    zhaiKind: zhaiSide.kind,
    governing,
    conflict,
  }
}
