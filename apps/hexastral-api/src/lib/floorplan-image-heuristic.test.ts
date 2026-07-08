import { describe, expect, test } from 'bun:test'
import { assessFloorplanImageQuality } from './floorplan-image-heuristic'

describe('floorplan-image-heuristic', () => {
  test('flags tiny payloads', () => {
    expect(assessFloorplanImageQuality(new Uint8Array(100))).toBe('low')
  })

  test('accepts minimal PNG header with reasonable dimensions', () => {
    const bytes = new Uint8Array(24)
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    bytes[16] = 0
    bytes[17] = 0
    bytes[18] = 1
    bytes[19] = 0x40 // 320 width
    bytes[20] = 0
    bytes[21] = 0
    bytes[22] = 1
    bytes[23] = 0x40 // 320 height
    const padded = new Uint8Array(9_000)
    padded.set(bytes)
    expect(assessFloorplanImageQuality(padded)).toBe('ok')
  })
})
