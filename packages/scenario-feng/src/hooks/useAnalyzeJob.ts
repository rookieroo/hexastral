/**
 * useAnalyzeJob(siteId) — enqueue an analyze job and poll until done.
 *
 * Flow:
 *   1. Caller invokes `start()` from a tap handler.
 *   2. Hook POSTs /api/feng/sites/:id/analyze → receives { jobId }.
 *   3. Polls GET /api/feng/jobs/:jobId every 800ms.
 *   4. When stage === 'done' the embedded `report` is exposed.
 *   5. On 'failed' the errorMessage is surfaced.
 *
 * Polling cancels when the component unmounts, the user calls `cancel()`,
 * or after `MAX_POLL_MS` to prevent runaway loops. 800ms is the sweet spot
 * — fast enough to feel interactive, slow enough that 3 tiles × Mapbox +
 * Gemini Vision + Claude synthesis don't get pelted with poll requests.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useFengClient } from '../context'
import {
  type AnalyzeEnqueueResponse,
  fengJobs,
  fengSites,
  type JobPollResponse,
  unwrap,
} from '../lib/feng-api'
import type { FengJobStage } from '../types'

const POLL_INTERVAL_MS = 800
const MAX_POLL_MS = 5 * 60 * 1000 // 5 minutes hard cap

export interface UseAnalyzeJobResult {
  /** Pass `siteIdOverride` when the hook was created before React state caught up (e.g. right after createSite). */
  start: (siteIdOverride?: string) => Promise<void>
  cancel: () => void
  /** Latest job snapshot (null until `start()` is called). */
  job: JobPollResponse | null
  /** Convenience: `job?.stage`. */
  stage: FengJobStage | null
  /** Convenience: `job?.progress / 100` (0–1 friendly for ProgressBar). */
  progress: number
  isRunning: boolean
  error: Error | null
}

export function useAnalyzeJob(siteId: string | null | undefined): UseAnalyzeJobResult {
  const { client, onError } = useFengClient()
  const [job, setJob] = useState<JobPollResponse | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelledRef = useRef(false)
  const startedAtRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const poll = useCallback(
    async (jobId: string): Promise<void> => {
      if (cancelledRef.current) return
      try {
        const j = await unwrap<JobPollResponse>(
          await fengJobs(client)[':id'].$get({ param: { id: jobId } })
        )
        if (cancelledRef.current) return
        setJob(j)
        if (j.stage === 'done' || j.stage === 'failed') {
          setIsRunning(false)
          if (j.stage === 'failed' && j.errorMessage) {
            const e = new Error(j.errorMessage)
            setError(e)
            onError?.(e)
          }
          return
        }
        const elapsed = startedAtRef.current ? Date.now() - startedAtRef.current : 0
        if (elapsed > MAX_POLL_MS) {
          const e = new Error('feng_job_timeout')
          setError(e)
          setIsRunning(false)
          onError?.(e)
          return
        }
        timerRef.current = setTimeout(() => void poll(jobId), POLL_INTERVAL_MS)
      } catch (err) {
        if (cancelledRef.current) return
        const e = err instanceof Error ? err : new Error(String(err))
        setError(e)
        setIsRunning(false)
        onError?.(e)
      }
    },
    [client, onError]
  )

  const start = useCallback(async (siteIdOverride?: string) => {
    const targetSiteId = siteIdOverride ?? siteId
    if (!targetSiteId) return
    cancelledRef.current = false
    clearTimer()
    setError(null)
    setJob(null)
    setIsRunning(true)
    startedAtRef.current = Date.now()
    try {
      const enq = await unwrap<AnalyzeEnqueueResponse>(
        await fengSites(client)[':id'].analyze.$post({ param: { id: targetSiteId } })
      )
      // Seed the snapshot so the UI shows "stage: maps, progress: 0" immediately.
      setJob({
        id: enq.jobId,
        siteId: enq.siteId,
        stage: 'maps',
        progress: 0,
        reportId: null,
        errorMessage: null,
        startedAt: new Date().toISOString(),
        finishedAt: null,
        report: null,
      })
      void poll(enq.jobId)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      setIsRunning(false)
      onError?.(e)
    }
  }, [client, onError, poll, siteId, clearTimer])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    clearTimer()
    setIsRunning(false)
  }, [clearTimer])

  useEffect(() => {
    return () => {
      cancelledRef.current = true
      clearTimer()
    }
  }, [clearTimer])

  return {
    start,
    cancel,
    job,
    stage: job?.stage ?? null,
    progress: job ? job.progress / 100 : 0,
    isRunning,
    error,
  }
}
