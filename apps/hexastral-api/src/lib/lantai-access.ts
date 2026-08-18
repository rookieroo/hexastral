import type { EntitlementKey } from '../config/products'

/** v1a free cap — open question whether to drop to 1 after conversion data. */
export const LANTAI_FREE_SLOT_CAP = 2
export const LANTAI_FREE_WORKSPACE_CAP = 1

export interface LantaiAccess {
  /** Unlimited shortcut slots: unlock buyout OR pro (server union). */
  unlimitedSlots: boolean
  /** Second+ Notion workspace: workspaces buyout only. */
  unlimitedWorkspaces: boolean
  /** AI templates (ledger): subscription only. Unlock does not include AI. */
  ai: boolean
}

export function resolveLantaiAccess(keys: readonly EntitlementKey[]): LantaiAccess {
  const unlock = keys.includes('lantai_unlock') || keys.includes('lantai_workspaces')
  const workspaces = keys.includes('lantai_workspaces')
  const pro = keys.includes('lantai_pro')
  return {
    unlimitedSlots: unlock || pro,
    unlimitedWorkspaces: workspaces,
    ai: pro,
  }
}

export function lantaiSlotAllowed(access: LantaiAccess, createdCount: number): boolean {
  if (access.unlimitedSlots) return true
  return createdCount < LANTAI_FREE_SLOT_CAP
}

export function lantaiWorkspaceAllowed(access: LantaiAccess, connectionCount: number): boolean {
  if (access.unlimitedWorkspaces) return true
  return connectionCount < LANTAI_FREE_WORKSPACE_CAP
}
