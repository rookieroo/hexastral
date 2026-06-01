/**
 * @zhop/scenario-yuan
 *
 * Shared logic for the Yuán (緣) synastry product. Consumed by:
 *   - apps/hexastral-app (bonds tab) — migration planned, see README
 *   - apps/yuan-app (planned, standalone Expo build)
 *
 * Setup (in app root):
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
 * Then any descendant component can call hooks:
 *
 *   const { invitation, respond } = useBondInvitation(token)
 *   const { bonds } = useBondList()
 *   const { detail, chapters } = useSynastryReport(bondId)
 *
 * See docs/decisions/0001-yuan-naming.md for product context.
 */

export * from './types'
export * from './hooks'
export * from './components'
export { YuanClientProvider, useYuanClient } from './context'
export type { YuanClientConfig, YuanClientProviderProps } from './context'
