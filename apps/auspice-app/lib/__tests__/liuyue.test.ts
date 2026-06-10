import { describe, expect, it } from 'bun:test'
import { forwardLiuyue } from '../liuyue'

// now = mid-June 2026 → the rolling window is 2026-06 .. 2027-05 (12 months).
const NOW = new Date('2026-06-15')

describe('forwardLiuyue', () => {
  it('current year shows this-month-forward only (no past months)', () => {
    const cells = forwardLiuyue(2026, null, NOW)
    expect(cells?.map((c) => c.month)).toEqual([6, 7, 8, 9, 10, 11, 12])
  })

  it('next year shows up to the 12-month boundary', () => {
    const cells = forwardLiuyue(2027, null, NOW)
    expect(cells?.map((c) => c.month)).toEqual([1, 2, 3, 4, 5])
  })

  it('the window totals exactly 12 months across the boundary', () => {
    const a = forwardLiuyue(2026, null, NOW)?.length ?? 0
    const b = forwardLiuyue(2027, null, NOW)?.length ?? 0
    expect(a + b).toBe(12)
  })

  it('a past year drills into nothing (null)', () => {
    expect(forwardLiuyue(2025, null, NOW)).toBeNull()
  })

  it('a far-future year drills into nothing — no foreknowledge', () => {
    expect(forwardLiuyue(2030, null, NOW)).toBeNull()
  })
})
