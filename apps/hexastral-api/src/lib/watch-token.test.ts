import { describe, expect, it } from 'bun:test'
import {
  formatWatchToken,
  generateWatchSecret,
  parseWatchBearerToken,
  sha256Hex,
  timingSafeEqual,
} from './watch-token'

describe('parseWatchBearerToken', () => {
  it('parses w1.<id>.<secret> from Authorization header', () => {
    const parsed = parseWatchBearerToken('Bearer w1.abc123.secret-part')
    expect(parsed).toEqual({ credentialId: 'abc123', secret: 'secret-part' })
  })

  it('rejects non-w1 tokens', () => {
    expect(parseWatchBearerToken('Bearer user-id-only')).toBeNull()
    expect(parseWatchBearerToken('Bearer w2.id.secret')).toBeNull()
    expect(parseWatchBearerToken(undefined)).toBeNull()
  })
})

describe('sha256Hex + timingSafeEqual', () => {
  it('hashes secrets deterministically', async () => {
    const secret = generateWatchSecret()
    const hashA = await sha256Hex(secret)
    const hashB = await sha256Hex(secret)
    expect(hashA).toBe(hashB)
    expect(hashA).toHaveLength(64)
  })

  it('compares digests in constant time', () => {
    expect(timingSafeEqual('abcd', 'abcd')).toBe(true)
    expect(timingSafeEqual('abcd', 'abce')).toBe(false)
    expect(timingSafeEqual('abcd', 'abc')).toBe(false)
  })
})

describe('formatWatchToken', () => {
  it('builds w1 prefix token', () => {
    expect(formatWatchToken('cred1', 's3cr3t')).toBe('w1.cred1.s3cr3t')
  })
})
