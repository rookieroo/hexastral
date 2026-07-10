import { describe, expect, it } from 'bun:test'
import {
  acceptLanguagePrefersEnglish,
  isBrandHost,
  localeCookieToHomePath,
  resolveBrandRootRedirect,
} from './brand-host'

describe('isBrandHost', () => {
  it('matches the four brand subdomains', () => {
    expect(isBrandHost('kanyu.hexastral.com')).toBe(true)
    expect(isBrandHost('yuel.hexastral.com')).toBe(true)
    expect(isBrandHost('hexastral.com')).toBe(false)
  })
})

describe('acceptLanguagePrefersEnglish', () => {
  it('detects en and en-US', () => {
    expect(acceptLanguagePrefersEnglish('en-US,en;q=0.9')).toBe(true)
    expect(acceptLanguagePrefersEnglish('en')).toBe(true)
  })

  it('rejects zh-first', () => {
    expect(acceptLanguagePrefersEnglish('zh-CN,zh;q=0.9,en;q=0.8')).toBe(false)
  })
})

describe('resolveBrandRootRedirect', () => {
  const host = 'kanyu.hexastral.com'

  it('redirects first visit bare / to /zh for Chinese-first default', () => {
    expect(
      resolveBrandRootRedirect({ host, localeCookie: null, acceptLanguage: 'zh-CN,en;q=0.8' })
    ).toBe('/zh')
  })

  it('serves English at / on first visit when Accept-Language is en', () => {
    expect(
      resolveBrandRootRedirect({ host, localeCookie: null, acceptLanguage: 'en-US,en;q=0.9' })
    ).toBe(null)
  })

  it('serves English at / when NEXT_LOCALE=en (repeat visit)', () => {
    expect(resolveBrandRootRedirect({ host, localeCookie: 'en', acceptLanguage: 'zh-CN' })).toBe(
      null
    )
  })

  it('does not redirect / when NEXT_LOCALE=zh so EN switcher can reach /', () => {
    expect(resolveBrandRootRedirect({ host, localeCookie: 'zh', acceptLanguage: 'zh-CN' })).toBe(
      null
    )
  })

  it('does not redirect / when NEXT_LOCALE=ja', () => {
    expect(resolveBrandRootRedirect({ host, localeCookie: 'ja', acceptLanguage: null })).toBe(null)
  })
})

describe('localeCookieToHomePath', () => {
  it('maps locales to home paths', () => {
    expect(localeCookieToHomePath('en')).toBe('/')
    expect(localeCookieToHomePath('zh')).toBe('/zh')
    expect(localeCookieToHomePath('ja')).toBe('/ja')
  })
})
