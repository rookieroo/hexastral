/**
 * Fēng app's pre-configured @zhop/hexastral-client.
 *
 * Wraps the createHexastralClient factory with the app's HMAC signer so
 * scenario-feng hooks (via FengClientProvider) can issue signed requests
 * without re-implementing auth.
 */

import { createHexastralClient, type HexastralClient } from '@zhop/hexastral-client'
import { FengClientProvider } from '@zhop/scenario-feng'
import { type ReactNode, useCallback, useEffect, useMemo } from 'react'
import { useAuth } from './auth'
import { config } from './config'
import { getDevPro, isDevProSync } from './dev-flags'
import { signRequest } from './hmac'

function buildClient(userId: string): HexastralClient {
  return createHexastralClient(config.apiUrl, {
    signRequest: async (method, path, body) => {
      const sig = await signRequest({ method, path, body, userId })
      const base = sig ?? {}
      // DEV-only: when the Settings DEV-Pro toggle is on, flag the request so the
      // server can skip the paywall (it only honors this when ALLOW_DEV_PRO is set).
      return isDevProSync() ? { ...base, 'x-feng-dev-pro': '1' } : base
    },
    headers: {
      Authorization: `Bearer ${userId}`,
    },
  })
}

export interface FengClientGateProps {
  children: ReactNode
  /** Optional fallback rendered while userId is being bootstrapped */
  fallback?: ReactNode
}

/**
 * Gate component — once `userId` is available, wraps children in
 * <FengClientProvider>. Before that, renders the fallback (or null).
 */
export function FengClientGate({ children, fallback = null }: FengClientGateProps) {
  const { userId, isLoading, resyncCredentials, credentialVersion } = useAuth()
  // Prime the DEV-Pro cache so the signer attaches the header from first request.
  useEffect(() => {
    void getDevPro()
  }, [])
  const client = useMemo(() => (userId ? buildClient(userId) : null), [userId, credentialVersion])

  const onError = useCallback(
    (err: Error) => {
      if (err.message.includes('Authentication failed')) {
        void resyncCredentials().catch((syncErr) => {
          if (__DEV__) console.warn('[Fēng client] credential resync failed', syncErr)
        })
      }
    },
    [resyncCredentials]
  )

  if (isLoading || !client) return <>{fallback}</>
  return (
    <FengClientProvider client={client} onError={onError}>
      {children}
    </FengClientProvider>
  )
}
