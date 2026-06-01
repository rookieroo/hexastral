/**
 * Fēng app's pre-configured @zhop/hexastral-client.
 *
 * Wraps the createHexastralClient factory with the app's HMAC signer so
 * scenario-feng hooks (via FengClientProvider) can issue signed requests
 * without re-implementing auth.
 */

import { createHexastralClient, type HexastralClient } from '@zhop/hexastral-client'
import { FengClientProvider } from '@zhop/scenario-feng'
import { type ReactNode, useMemo } from 'react'
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
  const { userId, isLoading } = useAuth()
  const client = useMemo(() => (userId ? buildClient(userId) : null), [userId])

  if (isLoading || !client) return <>{fallback}</>
  return <FengClientProvider client={client}>{children}</FengClientProvider>
}
