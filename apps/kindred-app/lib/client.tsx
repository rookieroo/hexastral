/**
 * Kindred app's pre-configured @zhop/hexastral-client.
 *
 * Wraps the createHexastralClient factory with the app's HMAC signer so
 * scenario-yuan hooks (via KindredClientProvider) can issue signed requests
 * without re-implementing auth.
 *
 * IMPORTANT: once a userId exists, always keep the expo-router <Stack> mounted.
 * Replacing the tree with only a BootSplash (old behaviour) left NavigationContainer
 * with no screens → DEV LogBox "action … was not handled by any navigator" on
 * Universal Links / early router.push (invite accept, timeline taps, Redirect).
 */

import { createHexastralClient, type HexastralClient } from '@zhop/hexastral-client'
import { KindredClientProvider } from '@zhop/scenario-kindred'
import { type ReactNode, useCallback, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
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
 * Gate — wraps children in <KindredClientProvider> once userId exists.
 * Route tree stays mounted; boot UI is an overlay so deep links can resolve.
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

  // Cold first launch (no cached userId yet): no client → splash only until provision.
  if (!client) return <>{fallback}</>

  return (
    <KindredClientProvider client={client} onError={onError}>
      <View style={styles.root}>
        {children}
        {isLoading ? (
          <View style={styles.bootOverlay} pointerEvents='auto'>
            {fallback}
          </View>
        ) : null}
      </View>
    </KindredClientProvider>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bootOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
})
