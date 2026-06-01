/**
 * Shared birth-edit gate.
 *
 * Editing birth info invalidates any generated reading, so the entry point is
 * guarded. Policy (matches `assertBirthEditQuota` on the server):
 *
 *   - Pro user → always editable; warns if voiding an existing reading.
 *   - Free + signed-in + quota fresh → editable (one lifetime correction).
 *   - Free + signed-out → `lockReason = 'sign_in_required'`.
 *   - Free + signed-in + quota used → `lockReason = 'quota_exhausted'`.
 *
 * Both `lockReason` paths let me.tsx render a tailored hint instead of a
 * generic "locked" state. Manifest data is refetched on focus via the caller
 * (me.tsx subscribes to `useFocusEffect`); this hook is a pure projection.
 */

import { fetchReportManifest, getPortfolioUserId } from '@zhop/satellite-runtime'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Alert } from 'react-native'

import { useEntitlement } from '@/lib/entitlement'
import { useI18n } from '@/lib/i18n'
import { useReadingMark } from '@/lib/reading-mark'

export type EditBirthLockReason = 'sign_in_required' | 'quota_exhausted'

export interface UseEditBirthResult {
  canEdit: boolean
  willVoid: boolean
  /** Why the edit entry is locked, or `null` if editable. */
  lockReason: EditBirthLockReason | null
  /** True while server state (manifest) is still loading on first mount. */
  loading: boolean
  editBirth: () => void
  /** Refresh the server-derived gate (call after a sign-in or after editing). */
  refresh: () => Promise<void>
}

export function useEditBirth(): UseEditBirthResult {
  const router = useRouter()
  const { t } = useI18n()
  const { entitlement } = useEntitlement()
  const { viewedAt } = useReadingMark()

  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [birthEditUsed, setBirthEditUsed] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const id = await getPortfolioUserId()
      setSignedIn(!!id)
      // Even an anonymous user can be queried for manifest if signed-fetch
      // returns null — we just treat it as quota-fresh and gate on sign-in.
      const m = await fetchReportManifest()
      setBirthEditUsed(m?.birthEditUsed ?? false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const hasViewedReading = viewedAt !== null
  const isPro = entitlement === 'paid'
  const canEdit = isPro || (!!signedIn && !birthEditUsed)
  const willVoid = canEdit && hasViewedReading
  const lockReason: EditBirthLockReason | null = canEdit
    ? null
    : !signedIn
      ? 'sign_in_required'
      : 'quota_exhausted'

  const editBirth = useCallback(() => {
    if (!canEdit) return
    if (willVoid) {
      Alert.alert(t('me.editAlertTitle'), t('me.editAlertBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('me.editAlertContinue'),
          style: 'destructive',
          onPress: () => router.push('/birth?mode=edit'),
        },
      ])
    } else {
      router.push('/birth?mode=edit')
    }
  }, [canEdit, willVoid, router, t])

  return { canEdit, willVoid, lockReason, loading, editBirth, refresh }
}
