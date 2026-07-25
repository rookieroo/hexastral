import { describe, expect, it } from 'bun:test'
import {
  apexOriginFromRequest,
  appIdForGatedPath,
  appIsPublicSurface,
  brandIdFromHost,
  isPathIndexable,
  stripLocalePrefix,
} from './launch-status'

describe('brandIdFromHost', () => {
  it('maps brand subdomains', () => {
    expect(brandIdFromHost('yuel.hexastral.com')).toBe('yuel')
    expect(brandIdFromHost('yuun.hexastral.com')).toBe('yuun')
    expect(brandIdFromHost('hexastral.com')).toBe(null)
  })
})

describe('appIsPublicSurface', () => {
  it('Yuun is public; other wave apps stay gated', () => {
    expect(appIsPublicSurface('yuun')).toBe(true)
    expect(appIsPublicSurface('yuel')).toBe(false)
    expect(appIsPublicSurface('kanyu')).toBe(false)
    expect(appIsPublicSurface('yaul')).toBe(false)
    expect(appIsPublicSurface('syel')).toBe(false)
  })
})

describe('appIdForGatedPath', () => {
  it('maps LP and privacy paths', () => {
    expect(appIdForGatedPath('/lp/yuel')).toBe('yuel')
    expect(appIdForGatedPath('/zh/lp/kanyu')).toBe('kanyu')
    expect(appIdForGatedPath('/privacy/yuun')).toBe('yuun')
    expect(appIdForGatedPath('/privacy/kindred')).toBe('yuel')
    expect(appIdForGatedPath('/tools/hexagram')).toBe(null)
  })
})

describe('isPathIndexable', () => {
  it('drops hidden-app LPs from the index', () => {
    expect(isPathIndexable('/lp/yuun')).toBe(true)
    expect(isPathIndexable('/lp/yuel')).toBe(false)
    expect(isPathIndexable('/lp/kanyu')).toBe(false)
    expect(isPathIndexable('/zh/lp/yuel')).toBe(false)
  })
})

describe('apexOriginFromRequest', () => {
  it('strips brand prefix to parent host', () => {
    expect(
      apexOriginFromRequest({ host: 'kanyu.hexastral.com', proto: 'https' })
    ).toBe('https://hexastral.com')
    expect(apexOriginFromRequest({ host: 'yuel.localhost:3000', proto: 'http' })).toBe(
      'http://localhost:3000'
    )
  })
})

describe('stripLocalePrefix', () => {
  it('strips locale segment', () => {
    expect(stripLocalePrefix('/zh/lp/yuel')).toBe('/lp/yuel')
    expect(stripLocalePrefix('/lp/yuel')).toBe('/lp/yuel')
  })
})
