/** Default production API unless `EXPO_PUBLIC_API_URL` is set in app env. */
export function resolvePortfolioApiUrl(): string {
  let fromEnv: string | undefined
  try {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
      ?.env
    const raw = env?.EXPO_PUBLIC_API_URL
    if (typeof raw === 'string' && raw.trim().length > 0) fromEnv = raw.trim()
  } catch {
    fromEnv = undefined
  }

  const base = fromEnv ?? 'https://api.hexastral.com'
  return base.replace(/\/+$/, '')
}
