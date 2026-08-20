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
  it('stacks palms behind the face, then fans left/right', () => {
    const stacked = polaroidPoses(0, POLAROID_FAN_W, POLAROID_CARD_W)
    const open = polaroidPoses(1, POLAROID_FAN_W, POLAROID_CARD_W)
    const cx = (POLAROID_FAN_W - POLAROID_CARD_W) / 2
    expect(POLAROID_CARD_H / POLAROID_CARD_W).toBeCloseTo(138 / 110, 5)
    expect(Math.abs(stacked.palm_l.left - (cx - 7))).toBeLessThan(0.2)
    expect(open.palm_l.left).toBeLessThan(stacked.palm_l.left)
    expect(open.palm_r.left).toBeGreaterThan(stacked.palm_r.left)
    expect(stacked.palm_l.scale).toBeLessThan(stacked.face.scale)
    expect(stacked.palm_l.z).toBeLessThan(stacked.face.z)
  })

  it('aligns baselines when fan is fully open', () => {
    const open = polaroidPoses(1, POLAROID_FAN_W, POLAROID_CARD_W, 1)
    expect(open.palm_l.top).toBeCloseTo(open.face.top, 0)
    expect(open.palm_r.top).toBeCloseTo(open.face.top, 0)
  })

  it('ritual lifts the fan and opens extra air', () => {
    const fan = polaroidPoses(1, POLAROID_FAN_W, POLAROID_CARD_W, 0)
    const rite = polaroidPoses(1, POLAROID_FAN_W, POLAROID_CARD_W, 1)
    expect(rite.face.top).toBeCloseTo(rite.palm_l.top, 0)
    expect(rite.palm_r.top).toBeCloseTo(rite.palm_l.top, 0)
    expect(rite.palm_l.top).toBeLessThan(fan.palm_l.top)
    expect(rite.palm_l.left).toBeLessThan(fan.palm_l.left)
    expect(rite.palm_r.left).toBeGreaterThan(fan.palm_r.left)
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
