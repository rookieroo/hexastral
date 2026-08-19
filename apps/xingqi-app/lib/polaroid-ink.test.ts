import { describe, expect, it } from 'bun:test'

import { POLAROID_WELL_INK, wobbleRectPath } from './polaroid-ink'

describe('wobbleRectPath', () => {
  it('closes a sketched rectangle', () => {
    const d = wobbleRectPath(2, 2, 96, 96, 0.6, 1)
    expect(d.startsWith('M ')).toBe(true)
    expect(d.endsWith(' Z')).toBe(true)
    expect(POLAROID_WELL_INK.includes('L ')).toBe(true)
  })
})
