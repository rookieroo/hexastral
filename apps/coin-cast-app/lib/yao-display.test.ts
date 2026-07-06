import { describe, expect, it } from 'bun:test'
import { yaoNumberForOverlayRow } from './yao-display'

describe('yao-display', () => {
  it('labels the first cast as yao 1', () => {
    expect(yaoNumberForOverlayRow(1, 0)).toBe(1)
  })

  it('labels the latest cast with the highest yao number', () => {
    expect(yaoNumberForOverlayRow(3, 0)).toBe(3)
    expect(yaoNumberForOverlayRow(3, 2)).toBe(1)
  })

  it('shows 上爻 as 6 when six lines are cast', () => {
    expect(yaoNumberForOverlayRow(6, 0)).toBe(6)
    expect(yaoNumberForOverlayRow(6, 5)).toBe(1)
  })
})
