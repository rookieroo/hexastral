/**
 * App Store redirect with DDL token handoff.
 *
 * Stores the token in both sessionStorage and a cookie so the
 * iOS universal-link handler / SKAdNetwork attribution can pick it up.
 */

const COOKIE_NAME = 'ddl_token'
const STORAGE_KEY = 'ddl_token'
const TOKEN_TTL_MS = 30 * 60 * 1000 // 30 minutes

/**
 * Persist the DDL token client-side and redirect to the App Store.
 *
 * The iOS app reads the token via:
 *   1. Universal link query param:  hexastral://launch?ddl=TOKEN
 *   2. Fallback: POST /api/ddl/resolve from the app after install
 *      using a fresh fingerprint to match the stored session.
 */
export function redirectToAppStore(appStoreUrl: string, token: string): void {
  const expires = new Date(Date.now() + TOKEN_TTL_MS).toUTCString()

  // Cookie — survives Safari redirect; read by universal link handler
  try {
    document.cookie = `${COOKIE_NAME}=${token}; expires=${expires}; path=/; SameSite=Lax`
  } catch {
    // Cookie blocked (unlikely) — carry on
  }

  // sessionStorage — available to onboarding pages before redirect
  try {
    sessionStorage.setItem(STORAGE_KEY, token)
    sessionStorage.setItem(`${STORAGE_KEY}_expires`, String(Date.now() + TOKEN_TTL_MS))
  } catch {
    // Private browsing / storage blocked — carry on
  }

  // Append both ddl + pt params for universal-link and legacy passthrough.
  const url = new URL(appStoreUrl)
  url.searchParams.set('ddl', token)
  url.searchParams.set('pt', token.slice(0, 20)) // pt = provider token (safe length)
  window.location.href = url.toString()
}

/** Read cached DDL token from sessionStorage (web fallback path) */
export function getCachedDDLToken(): string | null {
  try {
    const token = sessionStorage.getItem(STORAGE_KEY)
    const expires = Number(sessionStorage.getItem(`${STORAGE_KEY}_expires`) ?? 0)
    if (token && expires > Date.now()) return token
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(`${STORAGE_KEY}_expires`)
    return null
  } catch {
    return null
  }
}

/** Clear cached DDL token after the iOS app has claimed it */
export function clearCachedDDLToken(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(`${STORAGE_KEY}_expires`)
    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  } catch {
    // Ignore
  }
}
