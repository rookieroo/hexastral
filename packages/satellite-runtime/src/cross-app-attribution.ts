/**
 * Cross-app handoff attribution (Phase J · J.4.3).
 *
 * Captures the `?via=hexastral` (or `?from=hexastral`) parameter on a deep
 * link or universal link that launched the satellite, persists the source,
 * and emits one `AppInstallAttributedEvent` per install with provenance.
 *
 * The persisted source is the foundation for downstream paywall logic that
 * wants to recognize "this user came in from the hexastral flagship" and
 * apply a discount or special offer (ADR-0004 § Outbound funnel). The
 * pricing/discount layer itself is owned by the satellite's paywall and is
 * intentionally separate from this attribution capture.
 */

import type { AppInstallAttributedEvent } from '@zhop/growth-funnel'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Linking from 'expo-linking'

import { ingestGrowthEvent } from './growth-ingest'
import { freshEventEnvelope } from './new-event-envelope'

const CROSS_APP_SOURCE_KEY = 'cross_app_funnel_source_v1'
const CROSS_APP_ATTRIBUTED_KEY = 'cross_app_install_attributed_v1'

/** Maximum length of a `via=` source string we'll persist. */
const SOURCE_MAX_LEN = 32

/** Storage key for the persisted funnel source. */
export function crossAppSourceKey(storagePrefix: string): string {
  return `${storagePrefix}:${CROSS_APP_SOURCE_KEY}`
}

/** Parse `?via=` or `?from=` from a deep-link URL. Returns null if absent. */
export function extractCrossAppSource(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = Linking.parse(url)
    const raw = parsed.queryParams?.via ?? parsed.queryParams?.from
    if (typeof raw !== 'string') return null
    const trimmed = raw.trim()
    if (trimmed.length === 0 || trimmed.length > SOURCE_MAX_LEN) return null
    // Only allow simple identifiers — no slashes, spaces, control chars.
    if (!/^[A-Za-z0-9_.-]+$/.test(trimmed)) return null
    return trimmed
  } catch {
    return null
  }
}

/** Persist a funnel source string. Subsequent reads return this value. */
export async function setCrossAppFunnelSource(
  storagePrefix: string,
  source: string
): Promise<void> {
  await AsyncStorage.setItem(crossAppSourceKey(storagePrefix), source)
}

/**
 * Read the persisted funnel source. Returns null if never installed via
 * cross-app handoff. Survives across launches; never auto-expired (caller
 * is responsible for any TTL logic in the paywall layer).
 */
export async function getCrossAppFunnelSource(storagePrefix: string): Promise<string | null> {
  return await AsyncStorage.getItem(crossAppSourceKey(storagePrefix))
}

/** Clear the persisted source (e.g. after the user redeems the discount). */
export async function clearCrossAppFunnelSource(storagePrefix: string): Promise<void> {
  await AsyncStorage.removeItem(crossAppSourceKey(storagePrefix))
}

export interface CaptureCrossAppAttributionInput {
  url: string | null | undefined
  storagePrefix: string
  targetApp: string
  apiBase: string
  anonymousId: string
}

/**
 * Detect cross-app handoff in a URL. If `?via=` is present and the install
 * has not yet been attributed:
 *   1. Persist the source for downstream paywall use.
 *   2. Emit `app_install_attributed` once with `attribution_provider: 'cross_app:{source}'`.
 *
 * Subsequent calls during the same install are no-ops (idempotent via a
 * storage flag). Failures are swallowed to avoid blocking the boot path.
 */
export async function captureCrossAppAttribution(
  input: CaptureCrossAppAttributionInput
): Promise<void> {
  const source = extractCrossAppSource(input.url)
  if (!source) return

  const seenKey = `${input.storagePrefix}:${CROSS_APP_ATTRIBUTED_KEY}`
  try {
    const alreadyAttributed = await AsyncStorage.getItem(seenKey)
    if (alreadyAttributed) {
      // Still persist the latest source — a repeat tap from the same flagship
      // is the strongest signal of intent, so overwriting is correct.
      await setCrossAppFunnelSource(input.storagePrefix, source)
      return
    }

    await setCrossAppFunnelSource(input.storagePrefix, source)

    const event: AppInstallAttributedEvent = {
      ...freshEventEnvelope({
        anonymousId: input.anonymousId,
        targetApp: input.targetApp,
        surface: 'root',
      }),
      event_name: 'app_install_attributed',
      payload: {
        attribution_provider: `cross_app:${source}`,
        first_open_ms: Date.now(),
      },
    }
    await ingestGrowthEvent(input.apiBase, event)
    await AsyncStorage.setItem(seenKey, '1')
  } catch (err) {
    console.warn('[satellite-runtime] cross-app attribution failed', err)
  }
}
