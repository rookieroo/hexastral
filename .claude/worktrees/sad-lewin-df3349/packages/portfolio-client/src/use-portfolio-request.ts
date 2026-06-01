import { useCallback, useState } from 'react'
import { runAuto } from './portfolio-api'
import type { PortfolioRunResult, RunPortfolioParams } from './types'

export function usePortfolioRequest(baseOverride?: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PortfolioRunResult | null>(null)

  const execute = useCallback(
    async (params: RunPortfolioParams): Promise<PortfolioRunResult> => {
      setLoading(true)
      setError(null)
      try {
        const next = await runAuto(params, baseOverride)
        setData(next)
        return next
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Portfolio request failed'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [baseOverride]
  )

  return { data, loading, error, execute }
}
