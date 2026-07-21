import { runPreview } from '@zhop/portfolio-client'
import { getPortfolioUserId, resolvePortfolioApiUrl, signRequest } from '@zhop/satellite-runtime'
import * as FileSystem from 'expo-file-system/legacy'

import { getCachedBiometricConsent, setCachedBiometricConsent } from './biometric-consent-cache'
import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from './growth-config'
import type { CapturePart, ReadingDraft } from './reading-draft'
import { patchReadingDraft } from './reading-draft'

/** Per-photo VLM extract. Flash path should finish well under this; RN needs a hard abort. */
const EXTRACT_FETCH_TIMEOUT_MS = 100_000

/**
 * Always emit JPEG base64 ≤1280w. Raw HEIC labeled as image/jpeg hangs Gemini.
 */
async function readBase64(uri: string): Promise<string> {
  try {
    const ImageManipulator = await import('expo-image-manipulator')
    const resized = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1280 } }], {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    })
    if (resized.base64 && resized.base64.length > 0) return resized.base64
    return FileSystem.readAsStringAsync(resized.uri, { encoding: 'base64' })
  } catch (err) {
    console.warn('[xingqi.extract] jpeg_resize_failed', err)
    throw new Error('extract_image_encode_failed')
  }
}

async function signedJson(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  opts?: { timeoutMs?: number }
): Promise<Response> {
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('signin_required')
  const requestBody = body !== undefined ? JSON.stringify(body) : ''
  const signed = await signRequest({ body: requestBody, userId, method, path })
  if (!signed) throw new Error('signin_required')
  const timeoutMs = opts?.timeoutMs
  // RN-safe abort via AbortController + setTimeout (AbortSignal.timeout is spotty on Hermes).
  const ctrl = timeoutMs != null ? new AbortController() : null
  const timer =
    ctrl && timeoutMs != null
      ? setTimeout(() => {
          ctrl.abort()
        }, timeoutMs)
      : null
  try {
    return await fetch(`${resolvePortfolioApiUrl()}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${userId}`,
        // DEV builds: ask API to skip FaceOracle monthly meters when ALLOW_DEV_PRO=1.
        ...(__DEV__ ? { 'x-xingqi-dev-quota': '1' } : {}),
        ...signed,
      },
      ...(body !== undefined ? { body: requestBody } : {}),
      ...(ctrl ? { signal: ctrl.signal } : {}),
    })
  } catch (err) {
    const name = err instanceof Error ? err.name : ''
    const msg = err instanceof Error ? err.message : String(err)
    if (name === 'TimeoutError' || name === 'AbortError' || /aborted|timed?\s*out/i.test(msg)) {
      // Never embed ms — Alert surfaces this string if mapping misses.
      throw new Error('request_timeout')
    }
    // Normalize RN fetch failures (background suspend, airplane, DNS) for callers.
    if (isTransientNetworkError(msg)) {
      throw new Error('network_error')
    }
    throw err
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** RN / Hermes fetch failures when the app is backgrounded or briefly offline. */
export function isTransientNetworkError(msg: string): boolean {
  const m = msg.trim().toLowerCase()
  if (!m) return false
  if (m === 'network_error' || m === 'network error' || m === 'network request failed') return true
  if (m.includes('network request failed')) return true
  if (m.includes('failed to fetch')) return true
  if (m.includes('the internet connection appears to be offline')) return true
  if (m.includes('network connection was lost')) return true
  if (m.includes('nsurlerrordomain') || m.includes('NSURLError'.toLowerCase())) return true
  return false
}

/** True if server (or local cache) says biometric disclosure was accepted. */
export async function fetchBiometricConsent(): Promise<boolean> {
  const cached = await getCachedBiometricConsent()
  const userId = await getPortfolioUserId()
  if (!userId) return cached
  const path = `/api/user/${encodeURIComponent(userId)}/biometric-consent`
  try {
    const signed = await signRequest({ body: '', userId, method: 'GET', path })
    if (!signed) return cached
    const res = await fetch(`${resolvePortfolioApiUrl()}${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${userId}`,
        ...signed,
      },
    })
    if (!res.ok) return cached
    const json = (await res.json()) as { data?: { consented?: boolean } }
    const consented = Boolean(json.data?.consented)
    await setCachedBiometricConsent(consented)
    return consented
  } catch {
    return cached
  }
}

export async function recordBiometricConsent(): Promise<void> {
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('signin_required')
  const path = `/api/user/${encodeURIComponent(userId)}/biometric-consent`
  const signed = await signRequest({ body: '', userId, method: 'POST', path })
  if (!signed) throw new Error('signin_required')
  const res = await fetch(`${resolvePortfolioApiUrl()}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userId}`,
      ...signed,
    },
  })
  if (!res.ok) throw new Error(`consent_failed:${res.status}`)
  await setCachedBiometricConsent(true)
}

export async function revokeBiometricConsent(): Promise<void> {
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('signin_required')
  const path = `/api/user/${encodeURIComponent(userId)}/biometric-consent`
  const signed = await signRequest({ body: '', userId, method: 'DELETE', path })
  if (!signed) throw new Error('signin_required')
  const res = await fetch(`${resolvePortfolioApiUrl()}${path}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${userId}`,
      ...signed,
    },
  })
  if (!res.ok) throw new Error(`consent_revoke_failed:${res.status}`)
  await setCachedBiometricConsent(false)
}

export async function extractFeature(
  type: CapturePart,
  imageUri: string
): Promise<{ featureId: string; features: Record<string, string>; cached: boolean }> {
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('signin_required')
  const imageBase64 = await readBase64(imageUri)
  console.info('[xingqi.extract] start', { type, b64Chars: imageBase64.length })
  const res = await signedJson(
    'POST',
    '/api/physiognomy/face-features/from-base64',
    {
      userId,
      imageBase64,
      mimeType: 'image/jpeg',
      privacyConsentVersion: 'v1',
      type,
    },
    { timeoutMs: EXTRACT_FETCH_TIMEOUT_MS }
  )
  if (res.status === 403) {
    const j = (await res.json().catch(() => ({}))) as {
      error?: string | { message?: string }
      message?: string
    }
    const msg =
      typeof j.error === 'string'
        ? j.error
        : typeof j.error === 'object' && j.error?.message
          ? j.error.message
          : typeof j.message === 'string'
            ? j.message
            : ''
    if (msg === 'biometric_consent_required' || msg.includes('biometric')) {
      throw new Error('biometric_consent_required')
    }
    if (msg === 'not_pro' || msg.includes('not_pro')) {
      throw new Error('extract_not_pro')
    }
    throw new Error(`extract_forbidden:${res.status}`)
  }
  if (res.status === 422) {
    const j = (await res.json().catch(() => ({}))) as {
      error?: string | { message?: string }
      message?: string
    }
    const detail =
      typeof j.error === 'string'
        ? j.error
        : typeof j.error === 'object' && j.error?.message
          ? j.error.message
          : typeof j.message === 'string'
            ? j.message
            : ''
    if (detail.includes('modality_mismatch')) {
      throw new Error(`extract_modality_mismatch:${detail}`)
    }
    if (detail.includes('photo_quality_low')) {
      throw new Error(`extract_photo_quality_low:${detail}`)
    }
    throw new Error(detail ? `extract_failed:422:${detail}` : 'extract_failed:422')
  }
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as {
      error?: string | { message?: string }
      message?: string
    }
    const detail =
      typeof j.error === 'string'
        ? j.error
        : typeof j.error === 'object' && j.error?.message
          ? j.error.message
          : typeof j.message === 'string'
            ? j.message
            : ''
    throw new Error(
      detail ? `extract_failed:${res.status}:${detail}` : `extract_failed:${res.status}`
    )
  }
  const json = (await res.json()) as {
    featureId: string
    features?: Record<string, string>
    cached?: boolean
  }
  if (json.cached) {
    console.info('[xingqi.extract] vlm_cache_hit', { type, featureId: json.featureId })
  }
  return {
    featureId: json.featureId,
    features: json.features ?? {},
    cached: Boolean(json.cached),
  }
}

function unwrapApiData<T>(json: unknown): T {
  if (json && typeof json === 'object' && 'data' in json) {
    return (json as { data: T }).data
  }
  return json as T
}

export type FaceoracleJobStage = 'queued' | 'interpreting' | 'done' | 'failed'

export type FaceoracleJobPoll = {
  jobId: string
  stage: FaceoracleJobStage
  progress: number
  readingId: string | null
  errorMessage: string | null
  resultPayload: string | null
}

function buildJobBody(
  draft: ReadingDraft,
  locale: string,
  notifyOnComplete: boolean,
  regen = false
) {
  if (!draft.faceFeatureId || !draft.palmLeftFeatureId || !draft.palmRightFeatureId) {
    throw new Error('features_incomplete')
  }
  if (!draft.solarDate || draft.timeIndex == null || !draft.gender) {
    throw new Error('birth_incomplete')
  }
  return {
    faceFeatureId: draft.faceFeatureId,
    palmLeftFeatureId: draft.palmLeftFeatureId,
    palmRightFeatureId: draft.palmRightFeatureId,
    solarDate: draft.solarDate,
    timeIndex: draft.timeIndex,
    gender: draft.gender,
    city: draft.city,
    locale,
    outputKind: draft.outputKind ?? 'period_brief',
    horizonMonths: draft.horizonMonths ?? 3,
    updateKind: draft.updateKind ?? 'full',
    partialParts: draft.partialParts,
    notifyOnComplete,
    regen,
  }
}

/**
 * Ensure feature IDs exist before enqueue.
 * Sequential (not parallel): three concurrent VLM uploads starved the UI at 5%
 * and overloaded Gemini / cellular uplink.
 */
export async function ensureFeaturesExtracted(
  draft: ReadingDraft,
  opts?: { onProgress?: (progress: number) => void }
): Promise<ReadingDraft> {
  const next = { ...draft }
  const steps: Array<{
    part: CapturePart
    uri: string
    apply: (featureId: string) => void
  }> = []

  if (!next.palmLeftFeatureId && next.palmLeftUri) {
    steps.push({
      part: 'palm_l',
      uri: next.palmLeftUri,
      apply: (featureId) => {
        next.palmLeftFeatureId = featureId
        patchReadingDraft({ palmLeftFeatureId: featureId })
      },
    })
  }
  if (!next.palmRightFeatureId && next.palmRightUri) {
    steps.push({
      part: 'palm_r',
      uri: next.palmRightUri,
      apply: (featureId) => {
        next.palmRightFeatureId = featureId
        patchReadingDraft({ palmRightFeatureId: featureId })
      },
    })
  }
  if (!next.faceFeatureId && next.faceUri) {
    steps.push({
      part: 'face',
      uri: next.faceUri,
      apply: (featureId) => {
        next.faceFeatureId = featureId
        patchReadingDraft({ faceFeatureId: featureId })
      },
    })
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (!step) continue
    // 5 → 32 across pending extracts (runFaceReading then bumps to 35).
    const pct = 5 + Math.round(((i + 0.5) / Math.max(steps.length, 1)) * 27)
    opts?.onProgress?.(pct)
    const r = await extractFeature(step.part, step.uri)
    step.apply(r.featureId)
    opts?.onProgress?.(5 + Math.round(((i + 1) / Math.max(steps.length, 1)) * 30))
  }
  return next
}

export async function enqueueFaceReadingJob(
  draft: ReadingDraft,
  locale: string,
  notifyOnComplete = true,
  regen = false
): Promise<{ jobId: string; stage: FaceoracleJobStage; progress: number }> {
  const res = await signedJson(
    'POST',
    '/api/physiognomy/jobs',
    buildJobBody(draft, locale, notifyOnComplete, regen)
  )
  if (res.status === 403) {
    const j = (await res.json().catch(() => ({}))) as { error?: string }
    if (j.error === 'biometric_consent_required') throw new Error('biometric_consent_required')
    throw new Error(`job_forbidden:${res.status}`)
  }
  if (res.status === 402) {
    const j = (await res.json().catch(() => ({}))) as { error?: string }
    if (j.error === 'photo_slot_exhausted') throw new Error('photo_slot_exhausted')
    if (j.error === 'report_regen_exhausted') throw new Error('report_regen_exhausted')
    throw new Error('purchase_required')
  }
  if (res.status === 409) {
    const j = (await res.json().catch(() => ({}))) as { error?: string; code?: string }
    if (j.error === 'features_unchanged' || j.code === 'features_unchanged') {
      throw new Error('features_unchanged')
    }
    throw new Error(`job_conflict:${res.status}`)
  }
  if (res.status !== 202 && !res.ok) {
    const j = (await res.json().catch(() => ({}))) as {
      error?: string | { message?: string }
      message?: string
    }
    const detail =
      typeof j.error === 'string'
        ? j.error
        : typeof j.error === 'object' && j.error?.message
          ? j.error.message
          : typeof j.message === 'string'
            ? j.message
            : ''
    throw new Error(detail || `job_enqueue_failed:${res.status}`)
  }
  const data = unwrapApiData<{
    jobId: string
    stage: FaceoracleJobStage
    progress: number
    deduped?: boolean
  }>(await res.json())
  if (data.deduped) {
    console.info('[xingqi.job] deduped_inflight', { jobId: data.jobId })
  }
  return { jobId: data.jobId, stage: data.stage, progress: data.progress }
}

export async function getFaceReadingJob(jobId: string): Promise<FaceoracleJobPoll> {
  const res = await signedJson('GET', `/api/physiognomy/jobs/${encodeURIComponent(jobId)}`)
  if (!res.ok) throw new Error(`job_poll_failed:${res.status}`)
  const data = unwrapApiData<FaceoracleJobPoll>(await res.json())
  return {
    jobId: data.jobId,
    stage: data.stage,
    progress: data.progress ?? 0,
    readingId: data.readingId ?? null,
    errorMessage: data.errorMessage ?? null,
    resultPayload: data.resultPayload ?? null,
  }
}

export async function fetchActiveFaceReadingJob(): Promise<FaceoracleJobPoll | null> {
  const res = await signedJson('GET', '/api/physiognomy/jobs/active')
  if (!res.ok) return null
  const data = unwrapApiData<{ job: FaceoracleJobPoll | null }>(await res.json())
  return data.job ?? null
}

const POLL_INTERVAL_MS = 1500
const POLL_MAX_MS = 20 * 60 * 1000
/** Consecutive poll network blips before giving up as job_poll_timeout (quit-safe). */
const POLL_NETWORK_GRACE = 8

export async function pollFaceReadingJob(
  jobId: string,
  opts?: { signal?: AbortSignal; onProgress?: (p: FaceoracleJobPoll) => void }
): Promise<FaceoracleJobPoll> {
  const started = Date.now()
  let networkStreak = 0
  for (;;) {
    if (opts?.signal?.aborted) throw new Error('job_poll_aborted')
    try {
      const snap = await getFaceReadingJob(jobId)
      networkStreak = 0
      opts?.onProgress?.(snap)
      if (snap.stage === 'done' || snap.stage === 'failed') return snap
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // App background / brief offline: keep waiting — cloud queue owns the job.
      if (msg === 'network_error' || isTransientNetworkError(msg) || msg === 'request_timeout') {
        networkStreak += 1
        console.warn('[xingqi.job] poll_transient', { jobId, networkStreak, msg })
        if (networkStreak >= POLL_NETWORK_GRACE && Date.now() - started > 30_000) {
          // Enough evidence the client cannot stay online — hand off quit-safe.
          throw new Error('job_poll_timeout')
        }
      } else {
        throw err
      }
    }
    if (Date.now() - started > POLL_MAX_MS) throw new Error('job_poll_timeout')
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, POLL_INTERVAL_MS)
      opts?.signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(t)
          reject(new Error('job_poll_aborted'))
        },
        { once: true }
      )
    })
  }
}

export type FaceReadingProgress =
  | { phase: 'extracting'; progress: number }
  | { phase: 'queued' | 'interpreting' | 'done' | 'failed'; job: FaceoracleJobPoll }

/**
 * Extract (sync) → enqueue → poll. Callers should treat `queued` as the
 * quit-safe handoff point (server owns the LLM stage).
 */
export async function runFaceReading(
  draft: ReadingDraft,
  locale = 'en',
  opts?: {
    notifyOnComplete?: boolean
    regen?: boolean
    onProgress?: (p: FaceReadingProgress) => void
  }
): Promise<{
  mode: 'ok'
  readingId: string
  output: Record<string, unknown>
  jobId: string
}> {
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('signin_required')

  opts?.onProgress?.({ phase: 'extracting', progress: 5 })
  const withFeatures = await ensureFeaturesExtracted(draft, {
    onProgress: (progress) => opts?.onProgress?.({ phase: 'extracting', progress }),
  })
  opts?.onProgress?.({ phase: 'extracting', progress: 35 })

  const enqueued = await enqueueFaceReadingJob(
    withFeatures,
    locale,
    opts?.notifyOnComplete ?? true,
    opts?.regen ?? false
  )
  const queuedPoll: FaceoracleJobPoll = {
    jobId: enqueued.jobId,
    stage: enqueued.stage,
    progress: Math.max(enqueued.progress, 40),
    readingId: null,
    errorMessage: null,
    resultPayload: null,
  }
  opts?.onProgress?.({ phase: 'queued', job: queuedPoll })

  const done = await pollFaceReadingJob(enqueued.jobId, {
    onProgress: (p) => {
      const phase =
        p.stage === 'interpreting'
          ? 'interpreting'
          : p.stage === 'done'
            ? 'done'
            : p.stage === 'failed'
              ? 'failed'
              : 'queued'
      opts?.onProgress?.({ phase, job: p })
    },
  })
  if (done.stage === 'failed') {
    throw new Error(done.errorMessage || 'job_failed')
  }
  if (!done.readingId || !done.resultPayload) {
    throw new Error('job_missing_result')
  }
  let output: Record<string, unknown>
  try {
    output = JSON.parse(done.resultPayload) as Record<string, unknown>
  } catch {
    throw new Error('job_bad_result')
  }
  return { mode: 'ok', readingId: done.readingId, output, jobId: enqueued.jobId }
}

/** Free teaser only — never claims a full three-source reading. */
export async function runFaceTeaser(locale = 'en') {
  return runPreview({
    target: PORTFOLIO_TARGET_APP,
    input: { mode: 'face' as const },
    locale,
    anonymousStoragePrefix: PORTFOLIO_STORAGE_PREFIX,
  })
}

export async function fetchFaceEvents(): Promise<{
  events: Array<{
    startMonth?: string
    endMonth?: string | null
    theme?: string
    note?: string
  }>
  updatedAt?: string
}> {
  const res = await signedJson('GET', '/api/physiognomy/face-features/events')
  if (!res.ok) return { events: [] }
  const json = (await res.json()) as {
    events?: Array<{
      startMonth?: string
      endMonth?: string | null
      theme?: string
      note?: string
    }>
    updatedAt?: string
  }
  return { events: json.events ?? [], updatedAt: json.updatedAt }
}

export async function fetchPhotoQuota(): Promise<{
  used: number
  limit: number
  remaining: number
  photos: { used: number; limit: number; remaining: number }
  reports: { used: number; limit: number; remaining: number }
}> {
  const res = await signedJson('GET', '/api/physiognomy/face-features/quota')
  const fallback = {
    used: 0,
    limit: 6,
    remaining: 6,
    photos: { used: 0, limit: 6, remaining: 6 },
    reports: { used: 0, limit: 3, remaining: 3 },
  }
  if (!res.ok) return fallback
  const json = (await res.json()) as {
    used?: number
    limit?: number
    remaining?: number
    photos?: { used: number; limit: number; remaining: number }
    reports?: { used: number; limit: number; remaining: number }
  }
  const photos = json.photos ?? {
    used: json.used ?? 0,
    limit: json.limit ?? 6,
    remaining: json.remaining ?? 6,
  }
  const reports = json.reports ?? { used: 0, limit: 3, remaining: 3 }
  return {
    used: photos.used,
    limit: photos.limit,
    remaining: photos.remaining,
    photos,
    reports,
  }
}
