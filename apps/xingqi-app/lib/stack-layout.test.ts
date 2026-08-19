import { describe, expect, it } from 'bun:test'

import {
  POLAROID_CARD_H,
  POLAROID_CARD_W,
  POLAROID_FAN_W,
  polaroidPoses,
  WHEEL_ROW_GAP,
  wheelSpread,
} from './stack-layout'

describe('polaroidPoses', () => {
  it('stacks palms near the face when spread is 0', () => {
    const stacked = polaroidPoses(0, POLAROID_FAN_W, POLAROID_CARD_W)
    const open = polaroidPoses(1, POLAROID_FAN_W, POLAROID_CARD_W)
    const cx = (POLAROID_FAN_W - POLAROID_CARD_W) / 2
    expect(POLAROID_CARD_H / POLAROID_CARD_W).toBeCloseTo(136 / 108, 5)
    expect(Math.abs(stacked.palm_l.left - (cx - 7))).toBeLessThan(0.2)
    expect(open.palm_l.left).toBeLessThan(stacked.palm_l.left)
    expect(open.palm_r.left).toBeGreaterThan(stacked.palm_r.left)
  })
})

describe('WHEEL_ROW_GAP', () => {
  it('leaves room for date + excerpt above the stack', () => {
    expect(WHEEL_ROW_GAP).toBeGreaterThanOrEqual(220)
  })
})

describe('wheelSpread', () => {
  it('is 1 at center and 0 one slot away', () => {
    expect(wheelSpread(0)).toBe(1)
    expect(wheelSpread(1)).toBe(0)
    expect(wheelSpread(0.5)).toBe(0.5)
  })
})
