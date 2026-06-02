/**
 * KindredClientProvider — wires the @zhop/hexastral-client RPC client into all
 * scenario-yuan hooks via React Context.
 *
 * Usage in an app root (e.g., apps/kindred-app/app/_layout.tsx):
 *
 *   import { createHexastralClient } from '@zhop/hexastral-client'
 *   import { KindredClientProvider } from '@zhop/scenario-kindred'
 *
 *   const client = createHexastralClient(API_URL, { signRequest })
 *
 *   <KindredClientProvider client={client}>
 *     <App />
 *   </KindredClientProvider>
 *
 * Then hooks can use the client without prop-drilling:
 *
 *   const { invitation, accept } = useBondInvitation(token)
 *
 * Each app constructs its own client because authentication varies (HMAC on
 * mobile, bearer/Turnstile on web). scenario-yuan stays auth-agnostic.
 */

import type { HexastralClient } from '@zhop/hexastral-client'
import { createContext, type ReactNode, useContext } from 'react'

export interface KindredClientConfig {
  client: HexastralClient
  /** Optional callback when a fatal error occurs (e.g. invalid token) */
  onError?: (err: Error) => void
}

const KindredContext = createContext<KindredClientConfig | null>(null)

export interface KindredClientProviderProps extends KindredClientConfig {
  children: ReactNode
}

export function KindredClientProvider({ client, onError, children }: KindredClientProviderProps) {
  return <KindredContext.Provider value={{ client, onError }}>{children}</KindredContext.Provider>
}

export function useKindredClient(): KindredClientConfig {
  const ctx = useContext(KindredContext)
  if (!ctx) {
    throw new Error(
      'useKindredClient must be used inside <KindredClientProvider>. ' +
        'See @zhop/scenario-kindred README for setup.'
    )
  }
  return ctx
}
