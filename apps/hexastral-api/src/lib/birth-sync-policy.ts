/**
 * Birth sync access policy — multi-device (same app) + cross-app read gates.
 *
 * Birth fields always stay on `users` (account SSOT). These flags only control
 * whether a GET returns the body to a given (targetApp, installationId).
 *
 * Legacy rows without `birthSourceApp` are NOT treated as cross-app open: the
 * first authenticated caller with context may read (so Yuun can reconcile), and
 * the next PUT stamps source. Until stamped, other apps should not assume
 * permanent cross-app access — evaluateBirthSyncAccess still returns available
 * for unstamped rows so migration is possible, but GET now requires caller
 * context (no anonymous/context-less body dump).
 */

export type BirthSyncAccessStatus =
  | 'available'
  | 'empty'
  | 'multi_device_disabled'
  | 'cross_app_disabled'

export interface BirthSyncRow {
  birthSolarDate: string | null
  birthSourceApp: string | null
  birthOwnerInstallationId: string | null
  /** Default true when null (pre-migration / column default). */
  birthMultiDeviceSyncEnabled: boolean | null
  /** Default false when null. */
  birthCrossAppSyncEnabled: boolean | null
}

export interface BirthSyncRequestContext {
  targetApp: string
  installationId: string
}

export interface BirthSyncPreferences {
  multiDeviceSyncEnabled: boolean
  crossAppSyncEnabled: boolean
  sourceApp: string | null
  ownerInstallationId: string | null
  birthUpdatedAt: string | null
}

/** Normalize DB nulls to product defaults. */
export function normalizeBirthSyncPreferences(
  row: Pick<
    BirthSyncRow,
    | 'birthSourceApp'
    | 'birthOwnerInstallationId'
    | 'birthMultiDeviceSyncEnabled'
    | 'birthCrossAppSyncEnabled'
  > & { birthUpdatedAt?: string | null }
): BirthSyncPreferences {
  return {
    multiDeviceSyncEnabled: row.birthMultiDeviceSyncEnabled !== false,
    crossAppSyncEnabled: row.birthCrossAppSyncEnabled === true,
    sourceApp: row.birthSourceApp ?? null,
    ownerInstallationId: row.birthOwnerInstallationId ?? null,
    birthUpdatedAt: row.birthUpdatedAt ?? null,
  }
}

/**
 * Decide whether GET may return birth body for this request context.
 * Preference fields are always returned separately by the route.
 */
export function evaluateBirthSyncAccess(
  row: BirthSyncRow | null | undefined,
  ctx: BirthSyncRequestContext
): BirthSyncAccessStatus {
  if (!row?.birthSolarDate) return 'empty'

  // Unstamped history: allow read for the requesting caller so the home app can
  // reconcile and stamp on next PUT. Cross-app remains closed once a source is
  // stamped without crossAppSyncEnabled.
  if (!row.birthSourceApp) return 'available'

  const sameApp = row.birthSourceApp === ctx.targetApp
  const crossApp = row.birthCrossAppSyncEnabled === true
  const multiDevice = row.birthMultiDeviceSyncEnabled !== false

  if (!sameApp && !crossApp) return 'cross_app_disabled'

  if (
    sameApp &&
    !multiDevice &&
    row.birthOwnerInstallationId &&
    row.birthOwnerInstallationId !== ctx.installationId
  ) {
    return 'multi_device_disabled'
  }

  return 'available'
}

/**
 * Fields to stamp on a birth PUT. Always records source + updatedAt.
 * When multi-device is off, lock ownership to the writing install; when on, clear owner.
 */
export function birthSyncWriteStamp(input: {
  targetApp: string
  installationId: string
  /** Current (or default) multi-device preference. */
  multiDeviceSyncEnabled: boolean
  nowIso: string
}): {
  birthSourceApp: string
  birthOwnerInstallationId: string | null
  birthUpdatedAt: string
} {
  return {
    birthSourceApp: input.targetApp,
    birthOwnerInstallationId: input.multiDeviceSyncEnabled ? null : input.installationId,
    birthUpdatedAt: input.nowIso,
  }
}

/**
 * Preference PATCH side effects: turning multi-device off records the current
 * install as owner; turning it on clears the owner lock.
 */
export function birthSyncPreferencePatch(input: {
  installationId: string
  multiDeviceSyncEnabled?: boolean
  crossAppSyncEnabled?: boolean
}): {
  birthMultiDeviceSyncEnabled?: boolean
  birthCrossAppSyncEnabled?: boolean
  birthOwnerInstallationId?: string | null
} {
  const out: {
    birthMultiDeviceSyncEnabled?: boolean
    birthCrossAppSyncEnabled?: boolean
    birthOwnerInstallationId?: string | null
  } = {}

  if (input.crossAppSyncEnabled !== undefined) {
    out.birthCrossAppSyncEnabled = input.crossAppSyncEnabled
  }

  if (input.multiDeviceSyncEnabled !== undefined) {
    out.birthMultiDeviceSyncEnabled = input.multiDeviceSyncEnabled
    if (input.multiDeviceSyncEnabled) {
      out.birthOwnerInstallationId = null
    } else {
      out.birthOwnerInstallationId = input.installationId
    }
  }

  return out
}
