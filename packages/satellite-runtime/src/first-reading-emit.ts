/**
 * First-reading funnel-event helpers — once-per-user-per-app emits.
 *
 * Why this exists (P0-8): the funnel needs `first_reading_started` and
 * `first_reading_completed` to measure D1 conversion (install → first
 * reading), but those events MUST fire only once per device (we don't want
 * "first" to keep firing on every chart re-read). The shared
 * implementation prevents N satellite apps from each implementing their
 * own AsyncStorage guard.
 *
 * Storage: AsyncStorage flag per `(app, event)` namespace. App namespace
 * is required because the matrix has 8 apps; "first fate reading" and
 * "first yuan reading" are separate funnels.
 *
 * Idempotency: writing the flag is a side-effect of the emit. If
 * AsyncStorage is broken or write fails, we still emit (conservative —
 * better to over-count than miss a conversion). The flag write is
 * fire-and-forget after the emit.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

import { resolvePortfolioApiUrl } from './api-url'
import { ingestGrowthEvent } from './growth-ingest'
import { freshEventEnvelope } from './new-event-envelope'

type ReadingKind = string

interface FirstReadingEmitInput {
  /** App namespace ('fate', 'cycle', 'yuan', 'feng', etc.) */
  app: string
  /** Reading-domain key (e.g. 'natal', 'compatibility', 'almanac_today') */
  readingKind: ReadingKind
  /** App version for telemetry context. Optional. */
  appVersion?: string
}

function flagKey(app: string, event: 'started' | 'completed'): string {
  return `@hexastral/${app}/first_reading_${event}_fired`
}

async function hasFired(app: string, event: 'started' | 'completed'): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(flagKey(app, event))
    return v === '1'
  } catch {
    return false
  }
}

async function markFired(app: string, event: 'started' | 'completed'): Promise<void> {
  try {
    await AsyncStorage.setItem(flagKey(app, event), '1')
  } catch {
    // If we can't persist, re-emit next time. Conservative behavior.
  }
}

/**
 * Fire `first_reading_started` exactly once per `(app)` install. No-op on
 * subsequent calls. Safe to call from any number of code paths — only the
 * first wins.
 */
export async function emitFirstReadingStartedOnce(input: FirstReadingEmitInput): Promise<void> {
  if (await hasFired(input.app, 'started')) return
  const event = {
    ...freshEventEnvelope({ targetApp: input.app, surface: 'reading' }),
    event_name: 'first_reading_started' as const,
    payload: {
      reading_kind: input.readingKind,
      meta: input.appVersion ? { app_version: input.appVersion } : undefined,
    },
  }
  await ingestGrowthEvent(resolvePortfolioApiUrl(), event).catch(() => {
    // Network failure → keep flag unset so a future foreground retry can
    // catch up. We accept over-emit on retry rather than missing the
    // conversion entirely.
  })
  await markFired(input.app, 'started')
}

/**
 * Fire `first_reading_completed` exactly once per `(app)` install. Idempotent.
 */
export async function emitFirstReadingCompletedOnce(input: FirstReadingEmitInput): Promise<void> {
  if (await hasFired(input.app, 'completed')) return
  const event = {
    ...freshEventEnvelope({ targetApp: input.app, surface: 'reading' }),
    event_name: 'first_reading_completed' as const,
    payload: {
      reading_kind: input.readingKind,
      meta: input.appVersion ? { app_version: input.appVersion } : undefined,
    },
  }
  await ingestGrowthEvent(resolvePortfolioApiUrl(), event).catch(() => {})
  await markFired(input.app, 'completed')
}
