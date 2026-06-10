/**
 * Kindred app's pre-configured @zhop/hexastral-client.
 *
 * Wraps the createHexastralClient factory with the app's HMAC signer so
 * scenario-yuan hooks (via KindredClientProvider) can issue signed requests
 * without re-implementing auth.
 */

import { createHexastralClient, type HexastralClient } from '@zhop/hexastral-client'
import { KindredClientProvider } from '@zhop/scenario-kindred'
import { type ReactNode, useCallback, useMemo } from 'react'
import { useAuth } from './auth'
import { config } from './config'
import { signRequest } from './hmac'

function buildClient(userId: string): HexastralClient {
  return createHexastralClient(config.apiUrl, {
    signRequest: async (method, path, body) => {
      const sig = await signRequest({ method, path, body, userId })
      return sig ?? {}
    },
    headers: {
      Authorization: `Bearer ${userId}`,
    },
  })
}

export interface KindredClientGateProps {
  children: ReactNode
  /** Optional fallback rendered while userId is being bootstrapped */
  fallback?: ReactNode
}

/**
 * Gate component — once `userId` is available, wraps children in
 * <KindredClientProvider>. Before that, renders the fallback (or null).
 */
export function KindredClientGate({ children, fallback = null }: KindredClientGateProps) {
  const { userId, isLoading, resyncCredentials } = useAuth()
  const client = useMemo(() => (userId ? buildClient(userId) : null), [userId])

  const onError = useCallback(
    (err: Error) => {
      if (err.message.includes('Authentication failed')) {
        void resyncCredentials().catch((syncErr) => {
          if (__DEV__) console.warn('[Kindred client] credential resync failed', syncErr)
        })
      }
    },
    [resyncCredentials]
  )

  if (isLoading || !client) return <>{fallback}</>
  return (
    <KindredClientProvider client={client} onError={onError}>
      {children}
    </KindredClientProvider>
  )
}
