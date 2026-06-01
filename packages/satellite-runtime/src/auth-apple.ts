import type { PortfolioAppleLinkedEvent } from '@zhop/growth-funnel'

import { resolvePortfolioApiUrl } from './api-url'
import { ingestGrowthEvent } from './growth-ingest'
import { storeDeviceSecret } from './hmac'
import { getOrCreateAnonymousInstallId } from './install-id'
import { freshEventEnvelope } from './new-event-envelope'
import { setPortfolioUserId } from './session'

export type PortfolioAppleAuthSurface = 'apple_auth' | 'apple_banner'

/** POST identity token to portfolio Apple auth and persist device secret + user id. */
export async function exchangeAppleCredentialForPortfolio(opts: {
  identityToken: string
  authorizationCode?: string | null
  targetApp: string
  apiBaseOverride?: string
}): Promise<{ userId: string; deviceSecret: string }> {
  const apiBase = opts.apiBaseOverride?.replace(/\/+$/, '') ?? resolvePortfolioApiUrl()
  const res = await fetch(`${apiBase}/api/portfolio/auth/apple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identityToken: opts.identityToken,
      authorizationCode: opts.authorizationCode ?? undefined,
      target_app: opts.targetApp,
    }),
  })
  if (!res.ok) throw new Error(`portfolio auth failed: ${res.status}`)
  const payload = (await res.json()) as { userId: string; deviceSecret: string }
  await storeDeviceSecret(payload.deviceSecret)
  await setPortfolioUserId(payload.userId)
  return { userId: payload.userId, deviceSecret: payload.deviceSecret }
}

/** Funnel event after Apple interaction (sign-in UI or optional banner). */
export async function emitPortfolioAppleLinkedGrowth(opts: {
  apiBase: string
  storagePrefix: string
  targetApp: string
  surface: PortfolioAppleAuthSurface
  credentialPresent: boolean
}): Promise<void> {
  const base = opts.apiBase.replace(/\/+$/, '')
  const anon = await getOrCreateAnonymousInstallId(opts.storagePrefix)
  const linked: PortfolioAppleLinkedEvent = {
    ...freshEventEnvelope({
      anonymousId: anon,
      targetApp: opts.targetApp,
      surface: opts.surface,
    }),
    event_name: 'portfolio_apple_linked',
    payload: {
      credential_present: opts.credentialPresent,
    },
  }
  await ingestGrowthEvent(base, linked)
}
