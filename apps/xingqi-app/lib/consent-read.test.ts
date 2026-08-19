import { describe, expect, it } from 'bun:test'

import { estimateConsentReadMs } from './consent-read'

describe('estimateConsentReadMs', () => {
  it('clamps short copy to six seconds', () => {
    expect(estimateConsentReadMs(20)).toBe(6_000)
  })

  it('clamps long copy to eighteen seconds', () => {
    expect(estimateConsentReadMs(8_000)).toBe(18_000)
  })

  it('scales with character count inside the window', () => {
    expect(estimateConsentReadMs(80)).toBe(Math.round((80 / 380) * 60_000))
  })
})
