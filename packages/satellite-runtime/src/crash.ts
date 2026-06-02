/**
 * Crash reporting · Sentry wrapper for the 8-app matrix.
 *
 * Why this exists (P0-7): without crash reporting we ship blind. A 0.1%
 * fatal-error rate is invisible until a user happens to email support; by
 * that time hundreds of installs are silently broken. Sentry is the
 * standard answer — built into the React Native ecosystem, supports
 * source-map upload via EAS post-build hook.
 *
 * Design:
 *   - Single shared initializer used by all 8 satellite app RootLayouts
 *   - DSN read from `EXPO_PUBLIC_SENTRY_DSN` env (per app's eas.json),
 *     allowing per-environment routing without code change
 *   - Release auto-tagged from Constants (app version + build number)
 *   - Environment auto-tagged ('production' / 'preview' / 'development')
 *   - Graceful no-op when DSN is missing or @sentry/react-native is not
 *     installed — defaults to "do nothing" rather than crash the app
 *
 * Wiring (fate-app _layout.tsx is the canonical example):
 *   ```tsx
 *   import { initCrashReporting } from '@zhop/satellite-runtime'
 *   initCrashReporting({ app: 'fate' })   // top of file, before any JSX
 *   ```
 *
 * Source-map upload (separate manual step, doc only here):
 *   - EAS post-build hook runs `sentry-cli sourcemaps upload`
 *   - Authenticated via `SENTRY_AUTH_TOKEN` set in EAS secrets
 *   - See https://docs.sentry.io/platforms/react-native/sourcemaps/ for
 *     the EAS-specific recipe
 *
 * User-context tagging:
 *   - Call `setCrashUserContext(userId)` after sign-in completes so any
 *     subsequent crash carries the user attribution
 *   - Anonymous installs still report crashes; just untagged
 */

import Constants from 'expo-constants'

interface SentryLike {
  init: (config: Record<string, unknown>) => void
  captureException: (error: unknown, hint?: { extra?: Record<string, unknown> }) => void
  setUser: (user: { id?: string | null } | null) => void
  setTag: (key: string, value: string) => void
}

/**
 * Lazily resolve `@sentry/react-native`. Returns null if the package isn't
 * installed (graceful degrade) or if its surface diverged from what we
 * expect (defensive: a future SDK rename shouldn't crash callers).
 *
 * NOTE: dynamic require is intentional — the package may not be installed
 * in every satellite during early dev. We pay the cost once at boot.
 */
function loadSentry(): SentryLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod: unknown = require('@sentry/react-native')
    if (!mod || typeof mod !== 'object') return null
    const candidate = mod as Partial<SentryLike>
    if (
      typeof candidate.init === 'function' &&
      typeof candidate.captureException === 'function' &&
      typeof candidate.setUser === 'function' &&
      typeof candidate.setTag === 'function'
    ) {
      return candidate as SentryLike
    }
    return null
  } catch {
    return null
  }
}

let sentry: SentryLike | null = null
let initialized = false

interface InitOptions {
  /** App namespace ('fate' / 'cycle' / 'yuan' / 'feng' / etc.) — tag-only. */
  app: string
  /** Override DSN; default reads from `process.env.EXPO_PUBLIC_SENTRY_DSN`. */
  dsn?: string
  /** Trace sample rate (perf monitoring). Default 0 — only crashes, no perf. */
  tracesSampleRate?: number
  /**
   * Hard-skip even when DSN is configured. Useful for tests or to A/B kill
   * Sentry via the feature-flag system (`useFlag('crash_kill', false)`).
   */
  disabled?: boolean
}

/**
 * Initialize Sentry. Safe to call multiple times — only the first wins.
 * Safe to call with no DSN — degrades to no-op.
 */
export function initCrashReporting(options: InitOptions): void {
  if (initialized) return
  initialized = true

  if (options.disabled) return

  const dsn = options.dsn ?? readDsnFromEnv()
  if (!dsn) {
    // No DSN configured — every method on this module becomes a no-op.
    // Common for local dev. Not an error.
    return
  }

  sentry = loadSentry()
  if (!sentry) {
    // Package not installed. Log once so devs know to `bun add` if they
    // expected Sentry to be wired. Not an error.
    console.info('[crash] @sentry/react-native not installed; skipping init')
    return
  }

  const release = readRelease()
  const distribution = readDistribution()
  const environment = readEnvironment()

  sentry.init({
    dsn,
    environment,
    release,
    dist: distribution,
    tracesSampleRate: options.tracesSampleRate ?? 0,
    // Send default PII off — we tag the user_id ourselves; no email/ip needed.
    sendDefaultPii: false,
    // Cut down noise: don't auto-instrument every fetch/console.
    enableAutoSessionTracking: true,
  })

  sentry.setTag('app', options.app)
}

/**
 * Tag the active user on subsequent crashes. Call once after sign-in
 * completes. Pass null on sign-out to clear.
 */
export function setCrashUserContext(userId: string | null): void {
  if (!sentry) return
  sentry.setUser(userId ? { id: userId } : null)
}

/**
 * Manually report an exception that was caught (e.g. in a Promise rejection
 * we don't want to bubble). Uncaught exceptions auto-report via Sentry's
 * global handlers — no need to call this from a top-level catch.
 */
export function captureCrashError(error: unknown, extra?: Record<string, unknown>): void {
  if (!sentry) return
  sentry.captureException(error, extra ? { extra } : undefined)
}

function readDsnFromEnv(): string | undefined {
  try {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
      ?.env
    const raw = env?.EXPO_PUBLIC_SENTRY_DSN
    return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined
  } catch {
    return undefined
  }
}

function readRelease(): string | undefined {
  // ExpoConfig: version (semver) + ios.buildNumber / android.versionCode
  const expoConfig = Constants.expoConfig as {
    version?: string
    ios?: { buildNumber?: string }
    android?: { versionCode?: number }
  } | null
  const version = expoConfig?.version
  if (!version) return undefined
  return `app@${version}`
}

function readDistribution(): string | undefined {
  const expoConfig = Constants.expoConfig as {
    ios?: { buildNumber?: string }
    android?: { versionCode?: number }
  } | null
  return expoConfig?.ios?.buildNumber ?? expoConfig?.android?.versionCode?.toString() ?? undefined
}

function readEnvironment(): string {
  // EAS sets executionEnvironment to 'storeClient' (dev) / 'standalone'
  // (production) / 'bare' (bare workflow). Use this as a proxy.
  const exec = Constants.executionEnvironment
  if (exec === 'storeClient') return 'development'
  // 'standalone' covers both TestFlight + App Store production.
  return 'production'
}
