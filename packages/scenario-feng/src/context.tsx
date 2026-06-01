/**
 * FengClientProvider — wires the @zhop/hexastral-client RPC client into all
 * scenario-feng hooks via React Context.
 *
 * Usage in an app root (e.g., apps/feng-app/app/_layout.tsx):
 *
 *   import { createHexastralClient } from '@zhop/hexastral-client'
 *   import { FengClientProvider } from '@zhop/scenario-feng'
 *
 *   const client = createHexastralClient(API_URL, { signRequest })
 *
 *   <FengClientProvider client={client}>
 *     <App />
 *   </FengClientProvider>
 *
 * Mirrors YuanClientProvider — each app constructs its own client because
 * authentication varies (HMAC on mobile, bearer/Turnstile on web).
 */

import type { HexastralClient } from '@zhop/hexastral-client'
import { createContext, type ReactNode, useContext } from 'react'

export interface FengClientConfig {
  client: HexastralClient
  /** Optional callback when a fatal error occurs (e.g. invalid token) */
  onError?: (err: Error) => void
}

const FengContext = createContext<FengClientConfig | null>(null)

export interface FengClientProviderProps extends FengClientConfig {
  children: ReactNode
}

export function FengClientProvider({ client, onError, children }: FengClientProviderProps) {
  return <FengContext.Provider value={{ client, onError }}>{children}</FengContext.Provider>
}

export function useFengClient(): FengClientConfig {
  const ctx = useContext(FengContext)
  if (!ctx) {
    throw new Error(
      'useFengClient must be used inside <FengClientProvider>. ' +
        'See @zhop/scenario-feng README for setup.'
    )
  }
  return ctx
}
