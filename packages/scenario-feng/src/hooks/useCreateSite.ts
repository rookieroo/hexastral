/**
 * useCreateSite — mutation hook to create a new Fēng site.
 *
 * Backend: POST /api/feng/sites
 *
 * Returns a single function `createSite(input)`; the caller awaits and
 * navigates with the returned id. We keep this hook tiny (no internal state)
 * because the new-site flow already manages its own draft in AsyncStorage.
 */

import { useCallback } from 'react'
import { useFengClient } from '../context'
import { type CreateSiteInput, fengSites, type SiteMutateResponse, unwrap } from '../lib/feng-api'
import type { FengSite } from '../types'

export function useCreateSite(): (input: CreateSiteInput) => Promise<FengSite> {
  const { client, onError } = useFengClient()
  return useCallback(
    async (input: CreateSiteInput): Promise<FengSite> => {
      try {
        const data = await unwrap<SiteMutateResponse>(
          await fengSites(client).$post({ json: input })
        )
        return data.site
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        onError?.(e)
        throw e
      }
    },
    [client, onError]
  )
}
