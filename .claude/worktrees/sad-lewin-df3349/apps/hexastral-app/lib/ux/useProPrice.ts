/**
 * 获取 RevenueCat Pro 价格的 Hook
 *
 * 全局缓存，避免重复请求
 */

import { useEffect, useState } from 'react'
import { getAnnualPrice } from '../domain/subscription'

let cachedPrice: string | null = null
let fetching = false
const listeners = new Set<(price: string | null) => void>()

function notifyAll(price: string | null) {
  for (const fn of listeners) fn(price)
}

export function useProPrice(): string | null {
  const [price, setPrice] = useState<string | null>(cachedPrice)

  useEffect(() => {
    listeners.add(setPrice)

    if (cachedPrice) {
      setPrice(cachedPrice)
    } else if (!fetching) {
      fetching = true
      getAnnualPrice().then((p) => {
        cachedPrice = p
        fetching = false
        notifyAll(p)
      })
    }

    return () => {
      listeners.delete(setPrice)
    }
  }, [])

  return price
}
