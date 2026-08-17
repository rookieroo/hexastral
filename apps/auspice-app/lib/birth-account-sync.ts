/**
 * Yuun birth ↔ D1 account sync.
 *
 * Local AsyncStorage remains an offline + Widget/Watch mirror. Account SSOT is
 * `GET/PUT /api/portfolio/birth-info`. Conflict policy: server wins as the
 * suggested default; never auto-overwrite — UI must confirm.
 */

import {
  type BirthSyncAccessStatus,
  type BirthSyncPreferences,
  getOrCreateAnonymousInstallId,
  getPortfolioBirthInfo,
  getPortfolioUserId,
  saveAndCacheBirthInfo,
  updateBirthSyncPreferences,
} from '@zhop/satellite-runtime'
import { type AuspiceBirthInfo, getAuspiceBirthInfo, setAuspiceBirthInfo } from './birth'
import { birthInfosEqual, fromPortfolioBirth, toPortfolioBirth } from './birth-account-mapping'
import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from './growth-config'

export {
  birthInfosEqual,
  fromPortfolioBirth,
  toPortfolioBirth,
} from './birth-account-mapping'

export type BirthSyncConflict = {
  local: AuspiceBirthInfo
  remote: AuspiceBirthInfo
}

export type BirthAccountSyncResult =
  | { kind: 'guest' }
  | { kind: 'empty' }
  | { kind: 'applied'; info: AuspiceBirthInfo; sync: BirthSyncPreferences }
  | { kind: 'conflict'; conflict: BirthSyncConflict; sync: BirthSyncPreferences }
  | {
      kind: 'gated'
      status: Extract<BirthSyncAccessStatus, 'multi_device_disabled' | 'cross_app_disabled'>
      sync: BirthSyncPreferences
    }
  | { kind: 'error'; message: string }

export async function getYuunBirthCallerContext(): Promise<{
  targetApp: string
  installationId: string
}> {
  const installationId = await getOrCreateAnonymousInstallId(PORTFOLIO_STORAGE_PREFIX)
  return { targetApp: PORTFOLIO_TARGET_APP, installationId }
}

export async function pushLocalBirthToAccount(info: AuspiceBirthInfo): Promise<void> {
  const ctx = await getYuunBirthCallerContext()
  await saveAndCacheBirthInfo({ ...toPortfolioBirth(info), ...ctx })
  await setAuspiceBirthInfo(info)
}

export async function applyRemoteBirthToLocal(info: AuspiceBirthInfo): Promise<void> {
  await setAuspiceBirthInfo(info)
}

export async function setYuunMultiDeviceSync(enabled: boolean): Promise<BirthSyncPreferences> {
  const ctx = await getYuunBirthCallerContext()
  const res = await updateBirthSyncPreferences({
    ...ctx,
    multiDeviceSyncEnabled: enabled,
  })
  return res.sync
}

/**
 * Pull/push on launch or after sign-in. Never auto-resolves conflicts.
 */
export async function reconcileYuunBirthWithAccount(): Promise<BirthAccountSyncResult> {
  const userId = await getPortfolioUserId()
  if (!userId) return { kind: 'guest' }

  try {
    const ctx = await getYuunBirthCallerContext()
    const remote = await getPortfolioBirthInfo(ctx)
    const local = await getAuspiceBirthInfo()

    if (remote.status === 'multi_device_disabled' || remote.status === 'cross_app_disabled') {
      return { kind: 'gated', status: remote.status, sync: remote.sync }
    }

    if (!remote.birthInfo && !local) {
      return { kind: 'empty' }
    }

    if (!remote.birthInfo && local) {
      await pushLocalBirthToAccount(local)
      return { kind: 'applied', info: local, sync: remote.sync }
    }

    if (remote.birthInfo && !local) {
      const info = fromPortfolioBirth(remote.birthInfo)
      await applyRemoteBirthToLocal(info)
      return { kind: 'applied', info, sync: remote.sync }
    }

    if (remote.birthInfo && local) {
      const remoteInfo = fromPortfolioBirth(remote.birthInfo)
      if (birthInfosEqual(local, remoteInfo)) {
        await applyRemoteBirthToLocal(remoteInfo)
        return { kind: 'applied', info: remoteInfo, sync: remote.sync }
      }
      return {
        kind: 'conflict',
        conflict: { local, remote: remoteInfo },
        sync: remote.sync,
      }
    }

    return { kind: 'empty' }
  } catch (err) {
    return {
      kind: 'error',
      message: err instanceof Error ? err.message : String(err),
    }
  }
}

/** Stable fingerprint for conflict Alert debounce (same pair → one prompt). */
export function birthConflictPromptKey(conflict: BirthSyncConflict): string {
  const side = (info: AuspiceBirthInfo) =>
    [
      info.solarDate,
      info.timeIndex ?? '',
      info.gender ?? '',
      info.city ?? '',
      info.clockMinutes ?? '',
      info.calendar ?? 'solar',
      info.lunarInput ?? '',
      info.lunarIsLeap === true ? '1' : '0',
    ].join('|')
  return `${side(conflict.local)}::${side(conflict.remote)}`
}

/** Resolve conflict: keep account (overwrite local) or keep local (overwrite account). */
export async function resolveBirthConflict(
  choice: 'use_account' | 'use_local',
  conflict: BirthSyncConflict
): Promise<AuspiceBirthInfo> {
  if (choice === 'use_account') {
    await applyRemoteBirthToLocal(conflict.remote)
    return conflict.remote
  }
  await pushLocalBirthToAccount(conflict.local)
  return conflict.local
}
