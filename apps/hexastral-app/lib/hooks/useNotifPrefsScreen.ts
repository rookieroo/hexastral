/**
 * Notification preferences — hydrate from GET /api/user/:id (notif_prefs_json),
 * local edits while on screen, single PATCH on unmount when dirty.
 *
 * 退订接线：每日运势（dailyFortune / dailyFortuneEvening）的发送路径已在
 * `push-targets` 用 json_extract 按槽位过滤——关闭开关即不再入队。其余推送
 * （luckyWindow / chartTransit / fateReportReady）的退订过滤待接线。
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_NOTIF_PREFS, parseNotifPrefsJson } from '@/lib/domain/notifPrefs'
import { type NotifPrefs, useUpdatePreferences } from '@/lib/hooks/useUpdatePreferences'
import { useUserQuery } from '@/lib/hooks/useUserQuery'

type NK = keyof NotifPrefs

export const NOTIF_ROW_KEYS: Array<{ key: NK; labelKey: string; descKey: string }> = [
  { key: 'dailyFortune', labelKey: 'notif_daily_fortune', descKey: 'notif_daily_fortune_desc' },
  {
    key: 'dailyFortuneEvening',
    labelKey: 'notif_daily_fortune_evening',
    descKey: 'notif_daily_fortune_evening_desc',
  },
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
