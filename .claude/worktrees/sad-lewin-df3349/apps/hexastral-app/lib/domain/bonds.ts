/**
 * Bonds API client — fetches relationship data from hexastral-api
 *
 * Dual-mode:
 *   - Solo (默念): A enters B's birth data → private reading
 *   - Resonance (共振): A emails invitation → B responds → bidirectional bond
 */

import type { PairInterpretation } from '@/lib/hooks/usePairReadingQuery'
import { config } from '../config'
import { signRequest } from '../hmac'

// ── Types ────────────────────────────────────────────────────

export interface BondData {
  id: string
  ownerId: string
  targetUserId: string | null
  targetName: string
  relationshipLabel: string
  mode: 'solo' | 'resonance'
  hehunReadingId: string | null
  mirrorBondId: string | null
  status: 'active' | 'pending_invite' | 'declined' | 'expired' | 'removed'
  createdAt: string
  score: number | null
  grade: string | null
  archetypeName: string | null
  archetypeTagline: string | null
  archetypeCategory: 'harmony' | 'tension' | 'growth' | 'karmic' | 'volatile' | null
  hookDimension: 'long_term' | 'communication' | 'attraction' | 'emotional' | null
  unlockedDimensions: string | null // '4' = full, '1' = hookDimension only, null = legacy (treat as 4)
  sharedByOwner: boolean
  targetUser: { name: string | null; avatarKey: string | null } | null
  invitation: { expiresAt: string; targetEmail: string } | null
  relationshipStage: 'crush' | 'dating' | 'committed' | 'engaged' | 'married' | 'ex' | null
  /** Daily synastry for today (null when birth data unavailable) */
  todaySynastry: {
    synergy: number
    friction: number
    status: 'resonance' | 'tension' | 'neutral'
    date: string
  } | null
}

export interface BondDimension {
  key: 'long_term' | 'attraction' | 'communication' | 'emotional'
  name: string
  score: number | null // null when locked
  maxScore: number | null // null when locked
  note: string | null // null when locked
  isLocked: boolean
}

export interface BondDetailData extends BondData {
  dimensions: BondDimension[] | null
  /** Full AI interpretation (overview, day-master resonance, branches, highlights, advice…). */
  interpretation: PairInterpretation | null
}

export interface SoloBondInput {
  targetName: string
  relationshipLabel: string
  targetBirth: {
    solarDate: string
    timeIndex: number
    gender: '男' | '女'
    city?: string
  }
  language?: string
}

export interface SoloBondResult {
  bondId: string
  readingId: string
  mode: 'solo'
  score: number
  grade: string
  compatibility: Record<string, unknown>
  interpretation: Record<string, string>
}

export interface ResonanceInviteInput {
  targetEmail: string
  targetName: string
  relationshipLabel: string
  message?: string
}

export interface ResonanceInviteResult {
  bondId: string
  invitationId: string
  status: 'pending_invite'
  token: string
}

export interface BondInviteCredits {
  available: number
  lifetime: number
}

// ── API calls ────────────────────────────────────────────────

async function signedFetch(
  path: string,
  opts: { method: string; body?: string; userId: string }
): Promise<Response> {
  const url = `${config.apiUrl}${path}?userId=${opts.userId}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${opts.userId}`,
  }

  // Always sign — GET requests use empty string body for HMAC payload
  const sig = await signRequest({
    body: opts.body ?? '',
    userId: opts.userId,
    method: opts.method,
    path,
  })
  if (sig) Object.assign(headers, sig)

  return fetch(url, {
    method: opts.method,
    headers,
    body: opts.body,
  })
}

/** Fetch all bonds for current user */
export async function fetchBonds(userId: string): Promise<BondData[]> {
  const res = await signedFetch('/api/bonds', { method: 'GET', userId })
  if (!res.ok) throw new Error(`Failed to fetch bonds: ${res.status}`)
  const json = (await res.json()) as { data: { bonds: BondData[] } }
  return json.data.bonds
}

/** Create a solo bond (默念 mode) */
export async function createSoloBond(
  userId: string,
  input: SoloBondInput
): Promise<SoloBondResult> {
  const body = JSON.stringify(input)
  const res = await signedFetch('/api/bonds/solo', { method: 'POST', body, userId })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string; error?: string }
    throw new Error(err.message ?? err.error ?? `Solo bond failed: ${res.status}`)
  }
  const json = (await res.json()) as { data: SoloBondResult }
  return json.data
}

/** Send a resonance invitation (共振 mode) */
export async function sendResonanceInvite(
  userId: string,
  input: ResonanceInviteInput
): Promise<ResonanceInviteResult> {
  const body = JSON.stringify(input)
  const res = await signedFetch('/api/bonds/invite', { method: 'POST', body, userId })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string; error?: string }
    throw new Error(err.message ?? err.error ?? `Invite failed: ${res.status}`)
  }
  const json = (await res.json()) as { data: ResonanceInviteResult }
  return json.data
}

export async function fetchBondCredits(userId: string): Promise<BondInviteCredits> {
  const res = await signedFetch('/api/bonds/credits', { method: 'GET', userId })
  if (!res.ok) throw new Error(`Failed to fetch credits: ${res.status}`)
  const json = (await res.json()) as { data: BondInviteCredits }
  return json.data
}

/** Delete (soft-remove) a bond — auto-refunds if pending invite */
export async function deleteBond(userId: string, bondId: string): Promise<void> {
  const res = await signedFetch(`/api/bonds/${bondId}`, { method: 'DELETE', userId })
  if (!res.ok) throw new Error(`Failed to delete bond: ${res.status}`)
}

/** Update bond label/name */
export async function updateBond(
  userId: string,
  bondId: string,
  patch: { targetName?: string; relationshipLabel?: string }
): Promise<void> {
  const body = JSON.stringify(patch)
  const res = await signedFetch(`/api/bonds/${bondId}`, { method: 'PATCH', body, userId })
  if (!res.ok) throw new Error(`Failed to update bond: ${res.status}`)
}

type RelationshipStage = 'crush' | 'dating' | 'committed' | 'engaged' | 'married' | 'ex'

/** Update bond relationship stage */
export async function updateBondStage(
  userId: string,
  bondId: string,
  relationshipStage: RelationshipStage
): Promise<void> {
  const body = JSON.stringify({ relationshipStage })
  const res = await signedFetch(`/api/bonds/${bondId}/stage`, { method: 'PATCH', body, userId })
  if (!res.ok) throw new Error(`Failed to update bond stage: ${res.status}`)
}

// ── Invitation API (public, no HMAC) ────────────────────────

export interface InvitationInfo {
  invitationId: string
  inviterName: string
  inviterAvatarUrl: string | null
  relationshipLabel: string
  targetName: string
  message: string | null
  expiresAt: string
}

/** Fetch public invitation info by token */
export async function fetchInvitationInfo(token: string): Promise<InvitationInfo> {
  const res = await fetch(`${config.apiUrl}/api/bonds/invite/${token}/info`)
  if (!res.ok) {
    const status = res.status
    if (status === 404) throw new Error('Invitation not found')
    if (status === 410) throw new Error('Invitation expired')
    throw new Error(`Failed to fetch invitation: ${status}`)
  }
  const json = (await res.json()) as { data: InvitationInfo }
  return json.data
}

export interface RespondToInviteInput {
  userId: string
  action: 'accept' | 'decline'
  birthData?: {
    solarDate: string
    timeIndex: number
    gender: '男' | '女'
    city?: string
  }
  language?: string
}

export interface ExposedDimension {
  key: string
  label: string
  score: number
  description: string
}

export interface RespondResult {
  status: string
  readingId?: string
  mirrorBondId?: string | null
  score?: number
  grade?: string
  summary?: string | null
  exposedDimension?: ExposedDimension | null
  coinsRefunded?: number
}

/** Accept or decline an invitation */
export async function respondToInvite(
  token: string,
  input: RespondToInviteInput
): Promise<RespondResult> {
  const body = JSON.stringify(input)
  const res = await signedFetch(`/api/bonds/invite/${token}/respond`, {
    method: 'POST',
    body,
    userId: input.userId,
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(err.message ?? `Respond failed: ${res.status}`)
  }
  const json = (await res.json()) as { data: RespondResult }
  return json.data
}

/** Share result */
export interface ShareBondResult {
  shareId: string
  url: string
}

/** Create a shareable link for a bond's hehun reading */
export async function shareBondResult(userId: string, bondId: string): Promise<ShareBondResult> {
  const res = await signedFetch(`/api/bonds/${bondId}/share`, {
    method: 'POST',
    userId,
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(err.message ?? `Share failed: ${res.status}`)
  }
  const json = (await res.json()) as { data: ShareBondResult }
  return json.data
}

/** Unlock a bond's full reading (B pays 5 coins) */
export async function unlockBond(
  userId: string,
  bondId: string
): Promise<{ unlocked: boolean; coinsSpent?: number }> {
  const res = await signedFetch(`/api/bonds/${bondId}/unlock`, { method: 'POST', userId })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(err.message ?? `Unlock failed: ${res.status}`)
  }
  const json = (await res.json()) as {
    data: { unlocked?: boolean; alreadyUnlocked?: boolean; coinsSpent?: number }
  }
  return {
    unlocked: json.data.unlocked ?? json.data.alreadyUnlocked ?? false,
    coinsSpent: json.data.coinsSpent,
  }
}

/** Gift full reading to partner B (A's action, free) */
export async function giftBond(userId: string, bondId: string): Promise<void> {
  const res = await signedFetch(`/api/bonds/${bondId}/gift`, { method: 'POST', userId })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(err.message ?? `Gift failed: ${res.status}`)
  }
}

/** Fetch full bond detail including filtered dimensions */
export async function fetchBondDetail(userId: string, bondId: string): Promise<BondDetailData> {
  const res = await signedFetch(`/api/bonds/${bondId}`, { method: 'GET', userId })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(err.message ?? `Bond detail fetch failed: ${res.status}`)
  }
  const json = (await res.json()) as { data: BondDetailData }
  return json.data
}

// ── Predefined relationship labels ──────────────────────────

export const RELATIONSHIP_LABELS = [
  'spouse',
  'partner',
  'parent',
  'child',
  'sibling',
  'friend',
  'colleague',
  'boss',
] as const

export type RelationshipLabelKey = (typeof RELATIONSHIP_LABELS)[number]
