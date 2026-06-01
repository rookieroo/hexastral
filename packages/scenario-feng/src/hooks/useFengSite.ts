/**
 * useFengSite(siteId) — fetch one site + its latest report (if any).
 *
 * Backend: GET /api/feng/sites/:id
 */

import { useCallback, useEffect, useState } from 'react'
import { useFengClient } from '../context'
import { fengSites, type SiteDetailResponse, unwrap } from '../lib/feng-api'
import type { FengJobResponse, FengSite } from '../types'

export interface UseFengSiteResult {
  site: FengSite | null
  latestReport: FengJobResponse['report']
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useFengSite(siteId: string | null | undefined): UseFengSiteResult {
  const { client, onError } = useFengClient()
  const [site, setSite] = useState<FengSite | null>(null)
  const [latestReport, setLatestReport] = useState<FengJobResponse['report']>(null)
  const [isLoading, setIsLoading] = useState(!!siteId)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!siteId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await unwrap<SiteDetailResponse>(
        await fengSites(client)[':id'].$get({ param: { id: siteId } })
      )
      setSite(data.site)
      setLatestReport(data.latestReport ?? null)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      onError?.(e)
    } finally {
      setIsLoading(false)
    }
  }, [client, onError, siteId])

  useEffect(() => {
    if (!siteId) return
    void refetch()
  }, [refetch, siteId])

  return { site, latestReport, isLoading, error, refetch }
}
