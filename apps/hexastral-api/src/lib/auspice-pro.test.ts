import { describe, expect, it } from 'bun:test'
import { allowAuspiceDevGuardBypass, resolveAuspiceIsPro } from './auspice-pro'

describe('allowAuspiceDevGuardBypass', () => {
  it('rejects body.dev when ALLOW_DEV_PRO is off', () => {
    expect(allowAuspiceDevGuardBypass({ ALLOW_DEV_PRO: '0' }, true)).toBe(false)
    expect(allowAuspiceDevGuardBypass({}, true)).toBe(false)
  })

  it('allows body.dev only when ALLOW_DEV_PRO=1', () => {
    expect(allowAuspiceDevGuardBypass({ ALLOW_DEV_PRO: '1' }, true)).toBe(true)
    expect(allowAuspiceDevGuardBypass({ ALLOW_DEV_PRO: '1' }, false)).toBe(false)
  })
})

describe('resolveAuspiceIsPro', () => {
  it('fails closed without portfolio u', async () => {
    expect(await resolveAuspiceIsPro(undefined, {}, undefined)).toBe(false)
    expect(await resolveAuspiceIsPro(undefined, {}, null)).toBe(false)
    expect(await resolveAuspiceIsPro(undefined, {}, '')).toBe(false)
  })
})
