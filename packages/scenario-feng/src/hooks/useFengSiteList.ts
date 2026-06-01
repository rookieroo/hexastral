/**
 * useFengSiteList — list of the current user's Fēng sites.
 *
 * Backend: GET /api/feng/sites
 *
 * Returns plain `{ sites: FengSite[] }` (no Hono `data:` envelope — the
 * route handler stringifies the array directly).
 */

import { useCallback, useEffect, useState } from 'react'
import { useFengClient } from '../context'
import { fengSites, type SitesListResponse, unwrap } from '../lib/feng-api'
import type { FengSite } from '../types'

export interface UseFengSiteListResult {
  sites: FengSite[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useFengSiteList(): UseFengSiteListResult {
  const { client, onError } = useFengClient()
  const [sites, setSites] = useState<FengSite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await unwrap<SitesListResponse>(await fengSites(client).$get())
      setSites(data.sites)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      onError?.(e)
    } finally {
      setIsLoading(false)
    }
  }, [client, onError])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { sites, isLoading, error, refetch }
}
