/**
 * Hooks barrel — RPC wrappers around hexastral-client for Kindred domain endpoints.
 *
 * All hooks require a <KindredClientProvider> ancestor; see ../context.tsx.
 */

export type { UseBondInvitationResult } from './useBondInvitation'
export { useBondInvitation } from './useBondInvitation'
export type { UseBondListOptions, UseBondListResult } from './useBondList'
export { useBondList } from './useBondList'
export type { BondShareResult, UseShareBondResult } from './useShareBond'
export { useShareBond } from './useShareBond'
export type { UseSoloBondResult } from './useSoloBond'
export { useSoloBond } from './useSoloBond'
export type { UseSynastryReportResult } from './useSynastryReport'
export { useSynastryReport } from './useSynastryReport'
