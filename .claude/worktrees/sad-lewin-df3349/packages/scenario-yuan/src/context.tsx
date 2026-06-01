/**
 * YuanClientProvider — wires the @zhop/hexastral-client RPC client into all
 * scenario-yuan hooks via React Context.
 *
 * Usage in an app root (e.g., apps/yuan-app/app/_layout.tsx):
 *
 *   import { createHexastralClient } from '@zhop/hexastral-client'
 *   import { YuanClientProvider } from '@zhop/scenario-yuan'
 *
 *   const client = createHexastralClient(API_URL, { signRequest })
 *
 *   <YuanClientProvider client={client}>
 *     <App />
 *   </YuanClientProvider>
 *
 * Then hooks can use the client without prop-drilling:
 *
 *   const { invitation, accept } = useBondInvitation(token)
 *
 * Each app constructs its own client because authentication varies (HMAC on
 * mobile, bearer/Turnstile on web). scenario-yuan stays auth-agnostic.
 */

import { createContext, useContext, type ReactNode } from 'react'
import type { HexastralClient } from '@zhop/hexastral-client'

export interface YuanClientConfig {
  client: HexastralClient
  /** Optional callback when a fatal error occurs (e.g. invalid token) */
  onError?: (err: Error) => void
}

const YuanContext = createContext<YuanClientConfig | null>(null)

export interface YuanClientProviderProps extends YuanClientConfig {
  children: ReactNode
}

export function YuanClientProvider({ client, onError, children }: YuanClientProviderProps) {
  return (
    <YuanContext.Provider value={{ client, onError }}>
      {children}
    </YuanContext.Provider>
  )
}

export function useYuanClient(): YuanClientConfig {
  const ctx = useContext(YuanContext)
  if (!ctx) {
    throw new Error(
      'useYuanClient must be used inside <YuanClientProvider>. ' +
        'See @zhop/scenario-yuan README for setup.',
    )
  }
  return ctx
}
