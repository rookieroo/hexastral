import { describe, expect, test } from 'bun:test'
import type { DDLSession } from '@zhop/ddl-client'
import { extractAcceptClaim } from './ddl-claim'

function session(payload: unknown): DDLSession {
  return {
    fingerprint: {} as DDLSession['fingerprint'],
    meta: { payload: payload as Record<string, unknown> | undefined },
    createdAt: 0,
  }
}

describe('extractAcceptClaim', () => {
  test('pulls token + inviterName from a kindred-accept payload', () => {
    expect(
      extractAcceptClaim(session({ kind: 'kindred-accept', token: 'tok_123', inviterName: 'Mei' }))
    ).toEqual({ token: 'tok_123', inviterName: 'Mei' })
  })

  test('inviterName optional', () => {
    expect(extractAcceptClaim(session({ kind: 'kindred-accept', token: 'tok_123' }))).toEqual({
      token: 'tok_123',
      inviterName: undefined,
    })
  })

  test('ignores other DDL payload kinds (does not hijack non-invite installs)', () => {
    expect(extractAcceptClaim(session({ mode: 'personal', dayMaster: '甲' }))).toBeNull()
    expect(extractAcceptClaim(session({ kind: 'something-else', token: 'x' }))).toBeNull()
  })

  test('rejects missing / empty / non-string token', () => {
    expect(extractAcceptClaim(session({ kind: 'kindred-accept' }))).toBeNull()
    expect(extractAcceptClaim(session({ kind: 'kindred-accept', token: '' }))).toBeNull()
    expect(extractAcceptClaim(session({ kind: 'kindred-accept', token: 42 }))).toBeNull()
  })

  test('null / empty / malformed sessions → null', () => {
    expect(extractAcceptClaim(null)).toBeNull()
    expect(extractAcceptClaim(undefined)).toBeNull()
    expect(extractAcceptClaim(session(undefined))).toBeNull()
    expect(extractAcceptClaim(session(['not', 'an', 'object']))).toBeNull()
  })
})
