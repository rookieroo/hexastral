import { describe, expect, it } from 'bun:test'
import {
  houseDirections,
  luckyDirections,
  unluckyDirections,
  zhaiMingConcord,
} from '../../feng/ba-zhai'
import {
  isHighPriorityRoom,
  resolveRoomBaZhaiDualTrack,
} from '../../feng/room-ba-zhai'

describe('resolveRoomBaZhaiDualTrack', () => {
  it('marks 一致 when concordant and same verdict per palace', () => {
    const mingGua = '坎' as const
    const sitPalace = '坎' as const
    const concord = zhaiMingConcord(mingGua, sitPalace)
    const house = houseDirections(sitPalace)
    const track = resolveRoomBaZhaiDualTrack(
      '巽',
      { lucky: luckyDirections(mingGua), unlucky: unluckyDirections(mingGua) },
      house,
      concord
    )
    expect(track.mingBaZhai).toBe(track.zhaiBaZhai)
    expect(track.governing).toBe('一致')
    expect(track.conflict).toBe(false)
  })

  it('uses 命 governing when 宅命不配', () => {
    const mingGua = '坎' as const
    const sitPalace = '乾' as const
    const concord = zhaiMingConcord(mingGua, sitPalace)
    expect(concord.concordant).toBe(false)
    const house = houseDirections(sitPalace)
    const track = resolveRoomBaZhaiDualTrack(
      '震',
      { lucky: luckyDirections(mingGua), unlucky: unluckyDirections(mingGua) },
      house,
      concord
    )
    expect(track.governing).toBe('命')
  })

  it('flags high-priority room types', () => {
    expect(isHighPriorityRoom('大门')).toBe(true)
    expect(isHighPriorityRoom('客厅')).toBe(false)
  })
})
