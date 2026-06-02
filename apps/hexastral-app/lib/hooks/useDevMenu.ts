/**
 * useDevMenu — 隐藏开发者菜单触发逻辑
 *
 * 连续点击 5 次 (3 秒内) 唤起 Dev Tools 模态.
 */

import { useCallback, useRef, useState } from 'react'
import { getBirthInfo } from '@/lib/domain/birthInfo'

export function useDevMenu() {
  const [visible, setVisible] = useState(false)
  const [birthInfoSnapshot, setBirthInfoSnapshot] = useState<string>('')
  const tapCountRef = useRef(0)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const open = useCallback(() => {
    setVisible(true)
    getBirthInfo().then((info) => setBirthInfoSnapshot(JSON.stringify(info, null, 2)))
  }, [])

  const close = useCallback(() => setVisible(false), [])

  const triggerTap = useCallback(() => {
    tapCountRef.current += 1
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0
      open()
    }
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    resetTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0
    }, 3000)
  }, [open])

  return { visible, birthInfoSnapshot, open, close, triggerTap }
}
