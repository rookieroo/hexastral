import { describe, expect, it } from 'vitest'
import { classifyWebSurface, surfaceAllowsAdPixels } from './surface'

describe('classifyWebSurface', () => {
  it('tags brand LPs as lp_acq', () => {
    expect(classifyWebSurface('/lp/yuel')).toBe('lp_acq')
    expect(classifyWebSurface('/zh/lp/yuun')).toBe('lp_acq')
    expect(classifyWebSurface('/lp/kanyu')).toBe('lp_acq')
  })

  it('tags hexagram as lp_reopen', () => {
    expect(classifyWebSurface('/lp/hexagram/abc')).toBe('lp_reopen')
    expect(classifyWebSurface('/ja/lp/hexagram/abc')).toBe('lp_reopen')
  })

  it('only allows pixels on acq surfaces', () => {
    expect(surfaceAllowsAdPixels('lp_acq')).toBe(true)
    expect(surfaceAllowsAdPixels('brand_acq')).toBe(true)
    expect(surfaceAllowsAdPixels('lp_reopen')).toBe(false)
    expect(surfaceAllowsAdPixels('legal')).toBe(false)
  })
})
