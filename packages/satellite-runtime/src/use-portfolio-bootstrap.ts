import AsyncStorage from '@react-native-async-storage/async-storage'
import type { AppOpenEvent } from '@zhop/growth-funnel'
import Constants from 'expo-constants'
import * as Linking from 'expo-linking'
import { useEffect, useRef } from 'react'

import { resolvePortfolioApiUrl } from './api-url'
import { captureCrossAppAttribution } from './cross-app-attribution'
import { persistPendingDdlToken, resolvePendingPortfolioDdl } from './ddl-resolution'
import { ingestGrowthEvent } from './growth-ingest'
import { getOrCreateAnonymousInstallId } from './install-id'
import { freshEventEnvelope } from './new-event-envelope'

function appOpenSentKey(storagePrefix: string, appVersion?: string): string {
  return `${storagePrefix}:growth_app_open_sent_v1:${appVersion ?? 'unknown'}`
}

export interface UsePortfolioSatelliteBootstrapArgs {
  /** Must be unique per Expo app (e.g. faceread, starpalace) */
  storagePrefix: string
  /** Matches web `targetApp` / growth keys */
  targetApp: string
  /** Overrides default API base */
  apiBaseOverride?: string
}

/**
 * Runs once per mount: anonymous install id → `app_open` → capture DDL deep link → resolve KV session.
 */
export function usePortfolioSatelliteBootstrap(args: UsePortfolioSatelliteBootstrapArgs): void {
  const eventSubRef = useRef<{ remove: () => void } | null>(null)
  const apiBase = args.apiBaseOverride?.replace(/\/+$/, '') ?? resolvePortfolioApiUrl()

  useEffect(() => {
    let disposed = false

    ;(async () => {
      try {
        const anon = await getOrCreateAnonymousInstallId(args.storagePrefix)
        const ver = Constants.expoConfig?.version
        const appVersion = typeof ver === 'string' ? ver : undefined

        /** Sends one app_open per installed app version. */
        const openerKey = appOpenSentKey(args.storagePrefix, appVersion)
        const already = await AsyncStorage.getItem(openerKey)
        if (!already) {
          const appOpen: AppOpenEvent = {
            ...freshEventEnvelope({
              anonymousId: anon,
              targetApp: args.targetApp,
              surface: 'root',
            }),
            event_name: 'app_open',
            payload: {
              app_version: appVersion,
              ddl_resolved: false,
            },
          }
          await ingestGrowthEvent(apiBase, appOpen)
          await AsyncStorage.setItem(openerKey, '1')
        }

        const initialUrl = await Linking.getInitialURL()
        await persistPendingDdlToken(initialUrl, args.storagePrefix)
        await resolvePendingPortfolioDdl({
          apiBase,
          storagePrefix: args.storagePrefix,
          anonymousId: anon,
          targetApp: args.targetApp,
          ingest: ingestGrowthEvent,
        })
        // Cross-app handoff (e.g. ?via=hexastral from a DiscoveryCard tap).
        // Independent of DDL: a flagship may deep-link without a DDL token.
        await captureCrossAppAttribution({
          url: initialUrl,
          storagePrefix: args.storagePrefix,
          targetApp: args.targetApp,
          apiBase,
          anonymousId: anon,
        })

        const nextSub = Linking.addEventListener('url', async ({ url }) => {
          await persistPendingDdlToken(url, args.storagePrefix)
          await resolvePendingPortfolioDdl({
            apiBase,
            storagePrefix: args.storagePrefix,
            anonymousId: anon,
            targetApp: args.targetApp,
            ingest: ingestGrowthEvent,
          })
          await captureCrossAppAttribution({
            url,
            storagePrefix: args.storagePrefix,
            targetApp: args.targetApp,
            apiBase,
            anonymousId: anon,
          })
        })
        if (disposed) nextSub.remove()
        else eventSubRef.current = nextSub
      } catch (err) {
        console.warn('[satellite-runtime] bootstrap failed', err)
      }
    })()

    return () => {
      disposed = true
      eventSubRef.current?.remove()
      eventSubRef.current = null
    }
  }, [apiBase, args.storagePrefix, args.targetApp])
}
