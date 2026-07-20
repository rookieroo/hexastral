/**
 * Life-axis API — HMAC `/api/physiognomy/cycle/*` only.
 */

import { getPortfolioUserId, resolvePortfolioApiUrl, signRequest } from '@zhop/satellite-runtime'

import type { TimelinePayload } from './cycle-types'
import { isZhHant } from './locale-zh'

async function signedJson(
  method: 'GET' | 'POST' | 'DELETE',
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
      'X-Target-App': 'faceoracle',
      ...signed,
    },
    ...(body !== undefined ? { body: requestBody } : {}),
  })
}

function mapLocale(locale: string): 'zh-Hans' | 'zh-Hant' | 'ja' | 'en' {
  if (isZhHant(locale)) return 'zh-Hant'
  if (locale.startsWith('zh')) return 'zh-Hans'
  if (locale.startsWith('ja')) return 'ja'
  return 'en'
}

async function unwrapData<T>(res: Response): Promise<T> {
  if (res.status === 402) throw new Error('pro_required')
  if (!res.ok) throw new Error(`cycle_failed:${res.status}`)
  const json = (await res.json()) as { data?: T } | T
  if (json && typeof json === 'object' && 'data' in json && json.data !== undefined) {
    return json.data
  }
  return json as T
}

export async function fetchCycleTimeline(args: {
  birthDate: string
  birthHour: number
  gender: 'M' | 'F'
  locale: string
}): Promise<TimelinePayload> {
  const path = '/api/physiognomy/cycle/timeline'
  const res = await signedJson('POST', path, { ...args, locale: mapLocale(args.locale) })
  return unwrapData<TimelinePayload>(res)
}

export async function fetchCycleTimelineExplain(args: {
  birthDate: string
  birthHour: number
  gender: 'M' | 'F'
  locale: string
  nodeType: 'dayun' | 'liunian' | 'liuyue'
  year: number
  month?: number
  dayunIndex?: number
  readingId?: string
}): Promise<{ reading: string | null; source: string }> {
  const path = '/api/physiognomy/cycle/timeline/explain'
  const res = await signedJson('POST', path, { ...args, locale: mapLocale(args.locale) })
  return unwrapData(res)
}

export type MakeIfBranchInput = {
  id: string
  label: string
  divergeAtAge: number
  mergeAtAge: number | null
  isPast?: boolean
  realPillar?: string
}

export async function fetchMakeIfNarratives(args: {
  birthDate: string
  birthHour: number
  gender: 'M' | 'F'
  locale: string
  branches: MakeIfBranchInput[]
  readingId?: string
}): Promise<{
  narratives: Record<string, string>
  summaries?: Record<string, string>
  source: string
}> {
  const path = '/api/physiognomy/cycle/makeif'
  const res = await signedJson('POST', path, { ...args, locale: mapLocale(args.locale) })
  return unwrapData(res)
}

export async function fetchMakeIfNodeNarrative(args: {
  birthDate: string
  birthHour: number
  gender: 'M' | 'F'
  locale: string
  branch: MakeIfBranchInput
  focusAge: number
  focusRealPillar?: string
  focusRealFit?: '吉' | '平' | '凶'
  focusAltFit?: '吉' | '平' | '凶'
  readingId?: string
}): Promise<{ narrative: string; source: string }> {
  const path = '/api/physiognomy/cycle/makeif/node'
  const res = await signedJson('POST', path, { ...args, locale: mapLocale(args.locale) })
  return unwrapData(res)
}

export type SavedFork = {
  id: string
  label: string
  event: string
  divergeAtAge: number
  mergeAtAge: number | null
  isPast: boolean
  realPillar: string | null
  narrative: string
  locale: string
}

export async function saveMakeifFork(fork: {
  birthDate: string
  birthHour: number
  gender: 'M' | 'F'
  id: string
  label: string
  event: string
  divergeAtAge: number
  mergeAtAge: number | null
  isPast: boolean
  realPillar?: string
  narrative: string
  locale: string
}): Promise<void> {
  const path = '/api/physiognomy/cycle/makeif/forks'
  const res = await signedJson('POST', path, { ...fork, locale: mapLocale(fork.locale) })
  await unwrapData(res)
}

export async function listMakeifForks(args: {
  birthDate: string
  birthHour: number
  gender: 'M' | 'F'
}): Promise<SavedFork[]> {
  const q = new URLSearchParams({
    birthDate: args.birthDate,
    birthHour: String(args.birthHour),
    gender: args.gender,
  })
  const path = `/api/physiognomy/cycle/makeif/forks?${q}`
  const res = await signedJson('GET', path)
  const data = await unwrapData<{ forks: SavedFork[] }>(res)
  return data.forks ?? []
}

export async function deleteMakeifFork(id: string): Promise<void> {
  const path = `/api/physiognomy/cycle/makeif/forks/${encodeURIComponent(id)}`
  const res = await signedJson('DELETE', path)
  await unwrapData(res)
}

export type { TimelinePayload } from './cycle-types'
