/**
 * Yuán app's pre-configured @zhop/hexastral-client.
 *
 * Wraps the createHexastralClient factory with the app's HMAC signer so
 * scenario-yuan hooks (via YuanClientProvider) can issue signed requests
 * without re-implementing auth.
 */

import { createHexastralClient, type HexastralClient } from '@zhop/hexastral-client'
import { useMemo, type ReactNode } from 'react'
import { YuanClientProvider } from '@zhop/scenario-yuan'
import { config } from './config'
import { signRequest } from './hmac'
import { useAuth } from './auth'

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

export interface YuanClientGateProps {
  children: ReactNode
  /** Optional fallback rendered while userId is being bootstrapped */
  fallback?: ReactNode
}

/**
 * Gate component — once `userId` is available, wraps children in
 * <YuanClientProvider>. Before that, renders the fallback (or null).
 */
export function YuanClientGate({ children, fallback = null }: YuanClientGateProps) {
  const { userId, isLoading } = useAuth()
  const client = useMemo(() => (userId ? buildClient(userId) : null), [userId])

  if (isLoading || !client) return <>{fallback}</>
  return <YuanClientProvider client={client}>{children}</YuanClientProvider>
}
