import type { PortfolioGoogleLinkedEvent } from '@zhop/growth-funnel'

import { resolvePortfolioApiUrl } from './api-url'
import { ingestGrowthEvent } from './growth-ingest'
import { storeDeviceSecret } from './hmac'
import { getOrCreateAnonymousInstallId } from './install-id'
import { freshEventEnvelope } from './new-event-envelope'
import { setPortfolioUserId } from './session'

export type PortfolioGoogleAuthSurface = 'google_auth' | 'google_banner'

/** POST a Google idToken to portfolio Google auth and persist device secret + user id. */
export async function exchangeGoogleCredentialForPortfolio(opts: {
  idToken: string
  targetApp: string
  apiBaseOverride?: string
}): Promise<{ userId: string; deviceSecret: string }> {
  const apiBase = opts.apiBaseOverride?.replace(/\/+$/, '') ?? resolvePortfolioApiUrl()
  const res = await fetch(`${apiBase}/api/portfolio/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identityToken: opts.idToken,
      target_app: opts.targetApp,
    }),
  })
  if (!res.ok) throw new Error(`portfolio auth failed: ${res.status}`)
  const payload = (await res.json()) as { userId: string; deviceSecret: string }
  await storeDeviceSecret(payload.deviceSecret)
  await setPortfolioUserId(payload.userId)
  return { userId: payload.userId, deviceSecret: payload.deviceSecret }
}

/** Funnel event after Google interaction (sign-in UI or optional banner). */
export async function emitPortfolioGoogleLinkedGrowth(opts: {
  apiBase: string
  storagePrefix: string
  targetApp: string
  surface: PortfolioGoogleAuthSurface
  credentialPresent: boolean
}): Promise<void> {
  const base = opts.apiBase.replace(/\/+$/, '')
  const anon = await getOrCreateAnonymousInstallId(opts.storagePrefix)
  const linked: PortfolioGoogleLinkedEvent = {
    ...freshEventEnvelope({
      anonymousId: anon,
      targetApp: opts.targetApp,
      surface: opts.surface,
    }),
    event_name: 'portfolio_google_linked',
    payload: {
      credential_present: opts.credentialPresent,
    },
  }
  await ingestGrowthEvent(base, linked)
}
