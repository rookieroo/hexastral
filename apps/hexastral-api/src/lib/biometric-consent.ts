/**
 * Biometric (face/palm) processing consent — BIPA / GDPR Art.9 / CCPA-CPRA.
 *
 * Face & palm images are biometric identifiers. US Illinois **BIPA** carries statutory
 * damages ($1k–$5k per violation) + class-action exposure, so we require an EXPLICIT,
 * informed, timestamped opt-in BEFORE any biometric processing — a dedicated flag,
 * never inferred from ToS acceptance or reused from another toggle.
 *
 * Flow: client shows a dedicated consent screen → `POST /api/user/:id/biometric-consent`
 * records `{ biometricConsentAt, biometricConsentVersion }` → the face VLM pipeline
 * (`/linked/faceoracle`) checks `hasBiometricConsent` and 403s otherwise.
 *
 * Bump `BIOMETRIC_CONSENT_VERSION` whenever the disclosure text materially changes —
 * the gate then re-prompts users whose stored version is stale.
 */

import { eq } from 'drizzle-orm'
import { users } from '../db/schema'
import type { AppDb } from '../infra-types'

/** Current biometric-disclosure version. Bump on any material change to re-prompt. */
export const BIOMETRIC_CONSENT_VERSION = 'v1'

/**
 * True iff the user has an active biometric opt-in matching the current disclosure
 * version. A stale version (older disclosure) is treated as not-consented so the
 * client re-prompts.
 */
export async function hasBiometricConsent(db: AppDb, userId: string): Promise<boolean> {
  const row = await db
    .select({
      at: users.biometricConsentAt,
      version: users.biometricConsentVersion,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get()
  return Boolean(row?.at) && row?.version === BIOMETRIC_CONSENT_VERSION
}

/** Record an explicit biometric-processing opt-in at the current disclosure version. */
export async function recordBiometricConsent(db: AppDb, userId: string): Promise<void> {
  await db
    .update(users)
    .set({
      biometricConsentAt: new Date().toISOString(),
      biometricConsentVersion: BIOMETRIC_CONSENT_VERSION,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, userId))
}

/** Withdraw consent (GDPR/BIPA right to withdraw) — clears the opt-in. */
export async function revokeBiometricConsent(db: AppDb, userId: string): Promise<void> {
  await db
    .update(users)
    .set({
      biometricConsentAt: null,
      biometricConsentVersion: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, userId))
}
