import {
  getOrCreateAnonymousInstallId,
  getPortfolioUserId,
  invalidatePortfolioSession,
  repairPortfolioCredentialMismatch,
  resolvePortfolioApiUrl,
  signRequest,
} from '@zhop/satellite-runtime'
import { Platform } from 'react-native'
import type {
  PortfolioBirthInfo,
  PortfolioBirthInfoResponse,
  PortfolioLinkedResponse,
  PortfolioPreviewResponse,
  PortfolioReadingResponse,
  PortfolioReadingsResponse,
  PortfolioRefusedResponse,
  PortfolioRunResult,
  PortfolioTarget,
  RunLinkedParams,
  RunPortfolioParams,
} from './types'

/** Server returned HTTP 402 — e.g. CoinCast monthly free limit (upgrade or cast pack). */
export class PortfolioQuotaExceededError extends Error {
  readonly status = 402 as const
  /** Anonymous/guest daily limit on CoinCast — sign in to continue with linked quota. */
  readonly guestDailyLimit: boolean
  constructor(message = 'Portfolio quota exceeded', opts?: { guestDailyLimit?: boolean }) {
    super(message)
    this.name = 'PortfolioQuotaExceededError'
    this.guestDailyLimit = opts?.guestDailyLimit ?? false
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

function quotaExceededFromServerMessage(message: string): PortfolioQuotaExceededError {
  const guestDailyLimit = message.toLowerCase().includes('daily guest')
  return new PortfolioQuotaExceededError(message, { guestDailyLimit })
}

/** Linked session rejected (401) — local credentials cleared. */
export class PortfolioSessionExpiredError extends Error {
  readonly status = 401 as const
  constructor(message = 'Portfolio session expired') {
    super(message)
    this.name = 'PortfolioSessionExpiredError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** Linked CoinCast paused after repeated refusals — body includes `banned_until` ISO timestamp. */
export class PortfolioBannedError extends Error {
  readonly status = 403 as const
  readonly bannedUntil: string | null
  constructor(bannedUntil: string | null, message = 'CoinCast temporarily paused') {
    super(message)
    this.name = 'PortfolioBannedError'
    this.bannedUntil = bannedUntil
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

async function readPortfolioError(
  res: Response
): Promise<{ message: string; bannedUntil: string | null }> {
  try {
    const j: unknown = await res.json()
    if (j && typeof j === 'object') {
      const o = j as Record<string, unknown>
      const message =
        typeof o.error === 'string'
          ? o.error
          : typeof o.message === 'string'
            ? o.message
            : `Request failed (${res.status})`
      const bannedUntil = typeof o.banned_until === 'string' ? o.banned_until : null
      return { message, bannedUntil }
    }
  } catch {
    // ignore
  }
  return { message: `Request failed (${res.status})`, bannedUntil: null }
}

function buildPath(
  pathname: string,
  baseOverride?: string
): { base: string; url: string; path: string } {
  const base = baseOverride?.replace(/\/+$/, '') ?? resolvePortfolioApiUrl()
  return {
    base,
    path: pathname,
    url: `${base}${pathname}`,
  }
}

function resolveClientPlatform(): 'ios' | 'android' | 'web' {
  const os = Platform.OS
  if (os === 'ios') return 'ios'
  if (os === 'android') return 'android'
  return 'web'
}

async function enrichRunPortfolioParams<P extends RunPortfolioParams>(params: P): Promise<P> {
  const input = { ...params.input }
  const hasAnon = typeof input.anonymous_id === 'string' && input.anonymous_id.length > 0
  if (!hasAnon && params.anonymousStoragePrefix) {
    const anonymousId = await getOrCreateAnonymousInstallId(params.anonymousStoragePrefix)
    input.anonymous_id = anonymousId
  }
  const clientPlatform = params.clientPlatform ?? resolveClientPlatform()
  return { ...params, input, clientPlatform }
}

export type PortfolioErrorHandlers = {
  /** Guest / anonymous daily cap — typically prompt sign-in and/or paywall. */
  onQuotaGuest: () => void
  /** Linked user monthly or similar cap — typically paywall. */
  onQuotaLinked: () => void
  onBanned: (bannedUntil: string | null) => void
  onSessionExpired: () => void
  onGeneric: (err: unknown) => void
}

/**
 * Maps typed portfolio preview errors to host actions (Alert, navigation, etc.).
 * Does not import any UI layer.
 */
export function handlePortfolioError(err: unknown, handlers: PortfolioErrorHandlers): void {
  if (err instanceof PortfolioQuotaExceededError) {
    if (err.guestDailyLimit) handlers.onQuotaGuest()
    else handlers.onQuotaLinked()
    return
  }
  if (err instanceof PortfolioBannedError) {
    handlers.onBanned(err.bannedUntil)
    return
  }
  if (err instanceof PortfolioSessionExpiredError) {
    handlers.onSessionExpired()
    return
  }
  handlers.onGeneric(err)
}

export async function runPreview(
  params: RunPortfolioParams,
  baseOverride?: string
): Promise<PortfolioPreviewResponse | PortfolioRefusedResponse> {
  const enriched = await enrichRunPortfolioParams(params)
  const { url } = buildPath(`/api/portfolio/preview/${enriched.target}`, baseOverride)
  const body = JSON.stringify({
    input: enriched.input,
    locale: enriched.locale ?? 'en',
    ...(enriched.questionType ? { questionType: enriched.questionType } : {}),
  })
  const platform = enriched.clientPlatform ?? 'web'
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-client-platform': platform },
    body,
  })
  if (res.status === 402) {
    const { message } = await readPortfolioError(res)
    throw quotaExceededFromServerMessage(message)
  }
  if (res.status === 403) {
    const { message, bannedUntil } = await readPortfolioError(res)
    throw new PortfolioBannedError(bannedUntil, message)
  }
  if (!res.ok) throw new Error(`Portfolio preview failed: ${res.status}`)
  return (await res.json()) as PortfolioPreviewResponse | PortfolioRefusedResponse
}

export async function runLinked(
  params: RunLinkedParams,
  baseOverride?: string
): Promise<PortfolioLinkedResponse | PortfolioRefusedResponse> {
  await repairPortfolioCredentialMismatch()
  const enriched = await enrichRunPortfolioParams(params)
  const { path, url } = buildPath(`/api/portfolio/linked/${enriched.target}`, baseOverride)
  const body = JSON.stringify({
    input: enriched.input,
    locale: enriched.locale ?? 'en',
    ...(enriched.questionType ? { questionType: enriched.questionType } : {}),
  })
  const signed = await signRequest({
    body,
    userId: enriched.userId,
    method: 'POST',
    path,
  })
  if (!signed) {
    await invalidatePortfolioSession()
    throw new PortfolioSessionExpiredError('Linked request requires a fresh sign-in.')
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${enriched.userId}`,
      ...signed,
    },
    body,
  })
  if (res.status === 401) {
    await invalidatePortfolioSession()
    throw new PortfolioSessionExpiredError()
  }
  if (res.status === 402) {
    const { message } = await readPortfolioError(res)
    throw quotaExceededFromServerMessage(message)
  }
  if (res.status === 403) {
    const { message, bannedUntil } = await readPortfolioError(res)
    throw new PortfolioBannedError(bannedUntil, message)
  }
  if (!res.ok) throw new Error(`Portfolio linked failed: ${res.status}`)
  return (await res.json()) as PortfolioLinkedResponse | PortfolioRefusedResponse
}

export async function runAuto(
  params: RunPortfolioParams,
  baseOverride?: string
): Promise<PortfolioRunResult> {
  await repairPortfolioCredentialMismatch()
  const userId = await getPortfolioUserId()
  if (!userId) return runPreview(params, baseOverride)
  return runLinked({ ...params, userId }, baseOverride)
}

export async function fetchReadings(
  target: PortfolioTarget,
  cursor?: string | null,
  baseOverride?: string
): Promise<PortfolioReadingsResponse> {
  await repairPortfolioCredentialMismatch()
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('History requires authenticated user.')

  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  const path = `/api/portfolio/readings/${target}`
  const { url } = buildPath(`${path}${query}`, baseOverride)
  const signed = await signRequest({
    body: '',
    userId,
    method: 'GET',
    path,
  })
  if (!signed) {
    await invalidatePortfolioSession()
    throw new PortfolioSessionExpiredError(
      'History requires a fresh sign-in (device secret missing).'
    )
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${userId}`,
      ...signed,
    },
  })
  if (res.status === 401) {
    await invalidatePortfolioSession()
    throw new PortfolioSessionExpiredError()
  }
  if (!res.ok) throw new Error(`Portfolio readings failed: ${res.status}`)
  return (await res.json()) as PortfolioReadingsResponse
}

export async function fetchReadingById(
  target: PortfolioTarget,
  readingId: string,
  baseOverride?: string
): Promise<PortfolioReadingResponse> {
  await repairPortfolioCredentialMismatch()
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('Reading detail requires authenticated user.')

  const path = `/api/portfolio/readings/${target}/${readingId}`
  const { url } = buildPath(path, baseOverride)
  const signed = await signRequest({
    body: '',
    userId,
    method: 'GET',
    path,
  })
  if (!signed) {
    await invalidatePortfolioSession()
    throw new PortfolioSessionExpiredError()
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${userId}`,
      ...signed,
    },
  })
  if (res.status === 401) {
    await invalidatePortfolioSession()
    throw new PortfolioSessionExpiredError()
  }
  if (!res.ok) throw new Error(`Portfolio reading failed: ${res.status}`)
  return (await res.json()) as PortfolioReadingResponse
}

export async function saveBirthInfo(
  input: PortfolioBirthInfo,
  baseOverride?: string
): Promise<{ ok: boolean }> {
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('Birth info save requires authenticated user.')

  const path = '/api/portfolio/birth-info'
  const { url } = buildPath(path, baseOverride)
  const body = JSON.stringify(input)
  const signed = await signRequest({
    body,
    userId,
    method: 'PUT',
    path,
  })
  if (!signed) throw new Error('Birth info save requires deviceSecret.')

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userId}`,
      ...signed,
    },
    body,
  })
  if (!res.ok) throw new Error(`Birth info save failed: ${res.status}`)
  return (await res.json()) as { ok: boolean }
}

export async function getBirthInfo(baseOverride?: string): Promise<PortfolioBirthInfoResponse> {
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('Birth info fetch requires authenticated user.')

  const path = '/api/portfolio/birth-info'
  const { url } = buildPath(path, baseOverride)
  const signed = await signRequest({
    body: '',
    userId,
    method: 'GET',
    path,
  })
  if (!signed) throw new Error('Birth info fetch requires deviceSecret.')

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${userId}`,
      ...signed,
    },
  })
  if (!res.ok) throw new Error(`Birth info fetch failed: ${res.status}`)
  return (await res.json()) as PortfolioBirthInfoResponse
}

export async function fetchPortfolioMemoryPreference(
  baseOverride?: string
): Promise<{ enabled: boolean }> {
  await repairPortfolioCredentialMismatch()
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('Memory preference requires authenticated user.')

  const path = '/api/portfolio/memory-preference'
  const { url } = buildPath(path, baseOverride)
  const signed = await signRequest({
    body: '',
    userId,
    method: 'GET',
    path,
  })
  if (!signed) {
    await invalidatePortfolioSession()
    throw new PortfolioSessionExpiredError()
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${userId}`,
      ...signed,
    },
  })
  if (res.status === 401) {
    await invalidatePortfolioSession()
    throw new PortfolioSessionExpiredError()
  }
  if (!res.ok) throw new Error(`Portfolio memory preference fetch failed: ${res.status}`)
  return (await res.json()) as { enabled: boolean }
}

export async function setPortfolioMemoryPreference(
  enabled: boolean,
  baseOverride?: string
): Promise<{ ok: boolean; enabled: boolean }> {
  await repairPortfolioCredentialMismatch()
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('Memory preference requires authenticated user.')

  const path = '/api/portfolio/memory-preference'
  const { url } = buildPath(path, baseOverride)
  const body = JSON.stringify({ enabled })
  const signed = await signRequest({
    body,
    userId,
    method: 'PUT',
    path,
  })
  if (!signed) {
    await invalidatePortfolioSession()
    throw new PortfolioSessionExpiredError()
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userId}`,
      ...signed,
    },
    body,
  })
  if (res.status === 401) {
    await invalidatePortfolioSession()
    throw new PortfolioSessionExpiredError()
  }
  if (!res.ok) throw new Error(`Portfolio memory preference save failed: ${res.status}`)
  return (await res.json()) as { ok: boolean; enabled: boolean }
}

export async function deletePortfolioReading(
  target: PortfolioTarget,
  readingId: string,
  baseOverride?: string
): Promise<{ ok: boolean }> {
  await repairPortfolioCredentialMismatch()
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('Delete reading requires authenticated user.')

  const path = `/api/portfolio/readings/${target}/${readingId}`
  const { url } = buildPath(path, baseOverride)
  const signed = await signRequest({
    body: '',
    userId,
    method: 'DELETE',
    path,
  })
  if (!signed) {
    await invalidatePortfolioSession()
    throw new PortfolioSessionExpiredError()
  }

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${userId}`,
      ...signed,
    },
  })
  if (res.status === 401) {
    await invalidatePortfolioSession()
    throw new PortfolioSessionExpiredError()
  }
  if (!res.ok) throw new Error(`Portfolio reading delete failed: ${res.status}`)
  return (await res.json()) as { ok: boolean }
}
