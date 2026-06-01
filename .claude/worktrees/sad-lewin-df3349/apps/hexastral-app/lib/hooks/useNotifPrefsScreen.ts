/**
 * Notification preferences — hydrate from GET /api/user/:id (notif_prefs_json),
 * local edits while on screen, single PATCH on unmount when dirty.
 *
 * 注意：这些布尔值目前主要持久化用户意图；svc-notify / svc-fortune 的多数推送路径
 * 尚未在发送前读取 `notif_prefs_json` 做过滤（退订逻辑待接线）。
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_NOTIF_PREFS, parseNotifPrefsJson } from '@/lib/domain/notifPrefs'
import { useUpdatePreferences, type NotifPrefs } from '@/lib/hooks/useUpdatePreferences'
import { useUserQuery } from '@/lib/hooks/useUserQuery'

type NK = keyof NotifPrefs

export const NOTIF_ROW_KEYS: Array<{ key: NK; labelKey: string; descKey: string }> = [
  { key: 'dailyFortune', labelKey: 'notif_daily_fortune', descKey: 'notif_daily_fortune_desc' },
  { key: 'luckyWindow', labelKey: 'notif_lucky_window', descKey: 'notif_lucky_window_desc' },
  { key: 'chartTransit', labelKey: 'notif_chart_transit', descKey: 'notif_chart_transit_desc' },
  {
    key: 'fateReportReady',
    labelKey: 'notif_fate_report_ready',
    descKey: 'notif_fate_report_ready_desc',
  },
]

export function useNotifPrefsScreen(userId: string | null | undefined) {
  const { data: remoteUser } = useUserQuery(userId)
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS)
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs

  const dirtyRef = useRef(false)
  const userIdRef = useRef<string | null>(userId ?? null)
  userIdRef.current = userId ?? null
  const updatePreferences = useUpdatePreferences()
  const mutateRef = useRef(updatePreferences.mutate)
  mutateRef.current = updatePreferences.mutate

  const serverJsonRef = useRef<string | null>(null)

  useEffect(() => {
    const json = remoteUser?.notifPrefsJson ?? null
    if (json === serverJsonRef.current) return
    serverJsonRef.current = json
    if (dirtyRef.current) return
    const parsed = parseNotifPrefsJson(json)
    setPrefs(parsed ?? DEFAULT_NOTIF_PREFS)
  }, [remoteUser?.notifPrefsJson])

  useEffect(() => {
    return () => {
      if (!dirtyRef.current) return
      const uid = userIdRef.current
      if (!uid) return
      mutateRef.current({ userId: uid, notifPrefs: prefsRef.current })
    }
  }, [])

  const handlers = useMemo(() => {
    const map = {} as Record<NK, (v: boolean) => void>
    for (const { key } of NOTIF_ROW_KEYS) {
      map[key] = (v: boolean) => {
        setPrefs((prev) => {
          const next = { ...prev, [key]: v }
          prefsRef.current = next
          return next
        })
        dirtyRef.current = true
      }
    }
    return map
  }, [])

  return { prefs, handlers }
}
