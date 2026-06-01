import { Database } from 'bun:sqlite'
import { beforeEach, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { users } from '../db/schema'
import type { AppDb } from '../infra-types'
import {
  BIOMETRIC_CONSENT_VERSION,
  hasBiometricConsent,
  recordBiometricConsent,
  revokeBiometricConsent,
} from './biometric-consent'

// Minimal in-memory `users` subset (the columns the consent helpers touch).
function makeDb(): AppDb {
  const sqlite = new Database(':memory:')
  sqlite.exec(`CREATE TABLE users (
    id text PRIMARY KEY NOT NULL,
    biometric_consent_at text,
    biometric_consent_version text,
    updated_at text
  );`)
  sqlite.exec("INSERT INTO users (id) VALUES ('user-1');")
  return drizzle(sqlite) as unknown as AppDb
}

const U = 'user-1'

describe('biometric consent', () => {
  let db: AppDb
  beforeEach(() => {
    db = makeDb()
  })

  it('defaults to no consent (fail closed)', async () => {
    expect(await hasBiometricConsent(db, U)).toBe(false)
  })

  it('records an explicit opt-in at the current disclosure version', async () => {
    await recordBiometricConsent(db, U)
    expect(await hasBiometricConsent(db, U)).toBe(true)
  })

  it('treats a stale disclosure version as not-consented (forces re-prompt)', async () => {
    await recordBiometricConsent(db, U)
    await db.update(users).set({ biometricConsentVersion: 'v0-old' }).where(eq(users.id, U))
    expect(await hasBiometricConsent(db, U)).toBe(false)
  })

  it('withdrawal clears consent (GDPR/BIPA right to withdraw)', async () => {
    await recordBiometricConsent(db, U)
    await revokeBiometricConsent(db, U)
    expect(await hasBiometricConsent(db, U)).toBe(false)
  })

  it('exposes a disclosure version tag', () => {
    expect(BIOMETRIC_CONSENT_VERSION).toMatch(/^v\d/)
  })
})
