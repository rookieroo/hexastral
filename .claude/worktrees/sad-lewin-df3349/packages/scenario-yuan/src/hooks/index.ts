/**
 * Hooks barrel — RPC wrappers around hexastral-client for Yuán domain endpoints.
 *
 * All hooks require a <YuanClientProvider> ancestor; see ../context.tsx.
 */

export { useBondInvitation } from './useBondInvitation'
export type { UseBondInvitationResult } from './useBondInvitation'

export { useBondList } from './useBondList'
export type { UseBondListOptions, UseBondListResult } from './useBondList'

export { useSynastryReport } from './useSynastryReport'
export type { UseSynastryReportResult } from './useSynastryReport'
