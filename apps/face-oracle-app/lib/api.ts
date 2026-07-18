import { runLinked, runPreview } from '@zhop/portfolio-client'
import {
  getPortfolioUserId,
  resolvePortfolioApiUrl,
  signRequest,
} from '@zhop/satellite-runtime'
import * as FileSystem from 'expo-file-system/legacy'

import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from './growth-config'
import type { CapturePart, ReadingDraft } from './reading-draft'

async function readBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: 'base64' })
}

async function signedJson(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown
): Promise<Response> {
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('signin_required')
  const requestBody = body !== undefined ? JSON.stringify(body) : ''
  const signed = await signRequest({ body: requestBody, userId, method, path })
  if (!signed) throw new Error('signin_required')
  return fetch(`${resolvePortfolioApiUrl()}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${userId}`,
      ...signed,
    },
    ...(body !== undefined ? { body: requestBody } : {}),
  })
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
}

export async function extractFeature(
  type: CapturePart,
  imageUri: string
): Promise<{ featureId: string; features: Record<string, string> }> {
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('signin_required')
  const imageBase64 = await readBase64(imageUri)
  const res = await signedJson('POST', '/api/physiognomy/face-features/from-base64', {
    userId,
    imageBase64,
    mimeType: 'image/jpeg',
    privacyConsentVersion: 'v1',
    type,
  })
  if (res.status === 403) {
    const j = (await res.json().catch(() => ({}))) as { error?: string }
    if (j.error === 'biometric_consent_required') throw new Error('biometric_consent_required')
    throw new Error('extract_forbidden')
  }
  if (!res.ok) throw new Error(`extract_failed:${res.status}`)
  const json = (await res.json()) as {
    featureId: string
    features?: Record<string, string>
  }
  return { featureId: json.featureId, features: json.features ?? {} }
}

function buildLinkedInput(draft: ReadingDraft): Record<string, unknown> {
  return {
    faceFeatureId: draft.faceFeatureId,
    palmLeftFeatureId: draft.palmLeftFeatureId,
    palmRightFeatureId: draft.palmRightFeatureId,
    solarDate: draft.solarDate,
    timeIndex: draft.timeIndex,
    gender: draft.gender,
    city: draft.city,
    horizonMonths: draft.horizonMonths ?? 3,
    outputKind: draft.outputKind ?? 'oneshot',
    updateKind: draft.updateKind ?? 'full',
    partialParts: draft.partialParts,
  }
}

/** Ensure feature IDs exist (extract remaining photos) before paid reading. */
export async function ensureFeaturesExtracted(draft: ReadingDraft): Promise<ReadingDraft> {
  const next = { ...draft }
  if (!next.palmLeftFeatureId && next.palmLeftUri) {
    const r = await extractFeature('palm_l', next.palmLeftUri)
    next.palmLeftFeatureId = r.featureId
  }
  if (!next.palmRightFeatureId && next.palmRightUri) {
    const r = await extractFeature('palm_r', next.palmRightUri)
    next.palmRightFeatureId = r.featureId
  }
  if (!next.faceFeatureId && next.faceUri) {
    const r = await extractFeature('face', next.faceUri)
    next.faceFeatureId = r.featureId
  }
  return next
}

export async function runFaceReading(draft: ReadingDraft, locale = 'en') {
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('signin_required')
  const withFeatures = await ensureFeaturesExtracted(draft)
  return runLinked({
    target: PORTFOLIO_TARGET_APP,
    input: buildLinkedInput(withFeatures),
    locale,
    userId,
    anonymousStoragePrefix: PORTFOLIO_STORAGE_PREFIX,
  })
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
}> {
  const res = await signedJson('GET', '/api/physiognomy/face-features/quota')
  if (!res.ok) return { used: 0, limit: 6, remaining: 6 }
  return (await res.json()) as { used: number; limit: number; remaining: number }
}
