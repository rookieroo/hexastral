import AsyncStorage from '@react-native-async-storage/async-storage'
import { resolveDDLSession } from '@zhop/ddl-client/client'
import type { GrowthFunnelEvent, PortfolioDdlClaimedEvent } from '@zhop/growth-funnel'

import { ddlClaimedKey, pendingDdlTokenKey } from './ddl-claim-key'
import { storeLastResolvedDdlSession } from './ddl-session-cache'
import { extractDdlTokenFromUrl } from './ddl-token'
import { freshEventEnvelope } from './new-event-envelope'
import { uploadAnonGrowthAttribution } from './upload-growth-attribution'

type IngestFn = (apiBase: string, payload: GrowthFunnelEvent) => Promise<boolean>

/** Persist token from deeplink (`?ddl=`). */
export async function persistPendingDdlToken(
  url: string | null,
  storagePrefix: string
): Promise<void> {
  const token = extractDdlTokenFromUrl(url)
  if (!token) return
  await AsyncStorage.setItem(pendingDdlTokenKey(storagePrefix), token)
}

/**
 * Resolve pending DDL token once (GET /api/ddl/:token) and emit funnel + cache meta for UI.
 */
export async function resolvePendingPortfolioDdl(opts: {
  apiBase: string
  storagePrefix: string
  anonymousId: string
  targetApp: string
  ingest: IngestFn
}): Promise<void> {
  const claimed = await AsyncStorage.getItem(ddlClaimedKey(opts.storagePrefix))
  if (claimed === 'true') return

  const token = await AsyncStorage.getItem(pendingDdlTokenKey(opts.storagePrefix))
  if (!token) return

  try {
    const { session, found } = await resolveDDLSession(opts.apiBase, token)
    if (!found || !session) return

    await storeLastResolvedDdlSession(opts.storagePrefix, session)

    const payloadUnknown = session.meta.payload
    let payloadSource: string | undefined
    if (payloadUnknown && typeof payloadUnknown === 'object' && !Array.isArray(payloadUnknown)) {
      const p = payloadUnknown as Record<string, unknown>
      if (typeof p.source === 'string') payloadSource = p.source
      else if (typeof p.sourcePage === 'string') payloadSource = p.sourcePage
    }

    const claimedEvent: PortfolioDdlClaimedEvent = {
      ...freshEventEnvelope({
        anonymousId: opts.anonymousId,
        targetApp: opts.targetApp,
        surface: 'ddl',
      }),
      event_name: 'portfolio_ddl_claimed',
      payload: {
        has_meta_payload: !!(session.meta.payload && Object.keys(session.meta.payload).length > 0),
        landing_path: session.meta.landingPath,
        payload_source: payloadSource,
        has_click_ids: !!(session.meta.clickIds && Object.keys(session.meta.clickIds).length > 0),
      },
    }
    const ingested = await opts.ingest(opts.apiBase, claimedEvent)
    if (!ingested) {
      console.warn('[satellite-runtime] ddl claim event ingest failed, will retry later')
      return
    }
    await AsyncStorage.setItem(ddlClaimedKey(opts.storagePrefix), 'true')
    await AsyncStorage.removeItem(pendingDdlTokenKey(opts.storagePrefix))

    // Persist click ids server-side (anon) so later SSO + IAP can join CAPI Purchase
    void uploadAnonGrowthAttribution({
      apiBase: opts.apiBase,
      storagePrefix: opts.storagePrefix,
      targetApp: opts.targetApp,
    })
  } catch (err) {
    console.warn('[satellite-runtime] ddl resolution failed', err)
  }
}
