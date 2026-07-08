import { describe, expect, it } from 'bun:test'
import {
  luckyDirections,
  unluckyDirections,
  zhaiMingConcord,
} from '@zhop/astro-core'
import { deriveRoomFindings } from './feng-interior-compute'

describe('deriveRoomFindings dual-track', () => {
  const interior = {
    modelVersion: 'test',
    floors: [
      {
        key: 'f0',
        rooms: [{ type: '大门', palace: '巽', note: undefined }],
        形煞: [],
        缺角: [],
      },
    ],
  }

  it('populates ming and zhai tracks with governing', () => {
    const mingGua = '坎' as const
    const sitPalace = '坎' as const
    const findings = deriveRoomFindings(interior, {
      combinations: [],
      sitPalace,
      mingLucky: luckyDirections(mingGua),
      mingUnlucky: unluckyDirections(mingGua),
      concord: zhaiMingConcord(mingGua, sitPalace),
    })
    expect(findings).toHaveLength(1)
    const room = findings[0]
    expect(room.mingBaZhai).toBe(room.baZhai)
    expect(room.zhaiBaZhai).toBeDefined()
    expect(room.governing).toBeDefined()
    expect(room.priority).toBe('high')
  })

  it('falls back to 宅-only when no concord (no birth)', () => {
    const sitPalace = '坎' as const
    const findings = deriveRoomFindings(interior, {
      combinations: [],
      sitPalace,
      mingLucky: [],
      mingUnlucky: [],
    })
    expect(findings[0]?.governing).toBe('宅')
    expect(findings[0]?.mingBaZhai).toBe('neutral')
  })
})
