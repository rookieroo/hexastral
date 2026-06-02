/**
 * Quota & subscription status hook — wraps GET /api/quota
 *
 * Pro users: returns monthly quota breakdown (pair, divination, divinationToday, chatPool)
 * Non-Pro users: GET /api/quota returns 403 → quotaStatus is null
 *
 * Backed by React Query with 5-minute stale time.
 * handleApiError parses guard/credit errors from reading/chat API calls.
 */

import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useCallback, useState } from 'react'
import { config } from '@/lib/config'
import { signRequest } from '@/lib/hmac'

// ── Types ────────────────────────────────────────────────────

export interface QuotaItem {
  used: number
  limit: number
  remaining: number
}

export interface DivinationTodayItem {
  used: number
  dailyLimit: number
  remaining: number
}

export interface QuotaLimits {
  pairLimit: number
  divinationLimit: number
  divinationDailyLimit: number
  chatPool: number
  chatFreePerReading: number
}

/** Shape returned by GET /api/quota (Pro users only; non-Pro gets 403) */
export interface QuotaStatus {
  period: string
  plan: 'monthly' | 'annual'
  pair: QuotaItem
  divination: QuotaItem
  divinationToday: DivinationTodayItem
  chatPool: QuotaItem
  limits: QuotaLimits
}

export interface GuardState {
  guardKey?: string
  /** True when API returns 403 not_pro / pro_required — triggers Paywall */
  needsUpgrade?: boolean
  /** Set when API returns 402 purchase_required — triggers single-purchase modal */
  purchaseRequired?: {
    iapProductId: string
    price: string
    skuId: string
  }
}

// ── Fetch helper ─────────────────────────────────────────────

async function fetchQuota(userId: string): Promise<QuotaStatus> {
  const path = '/api/quota'
  const url = `${config.apiUrl}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${userId}`,
  }
  const sig = await signRequest({ body: '', userId, method: 'GET', path })
  if (sig) Object.assign(headers, sig)

  const res = await fetch(url, { headers })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(`quota:${res.status}:${data.error ?? ''}`)
  }
  return res.json() as Promise<QuotaStatus>
}

// ── React Query hook ─────────────────────────────────────────

export function useQuotaQuery(userId: string | null | undefined) {
  return useQuery<QuotaStatus>({
    queryKey: ['quota', userId],
    queryFn: () => fetchQuota(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false, // Don't retry 403 for non-Pro users
  })
}

// ── Guard error parsing ──────────────────────────────────────

function parseGuardError(err: unknown): GuardState | null {
  if (!(err instanceof Error)) return null
  const msg = err.message

  // 403 — needs Pro subscription (quota:403:not_pro, pro_required, not_pro)
  if (msg.includes('403') || msg.includes('not_pro') || msg.includes('pro_required')) {
    return { needsUpgrade: true }
  }

  // 402 — single-purchase required (purchase_required with iapProductId + price)
  if (msg.includes('purchase_required')) {
    // Try to parse structured error data attached to the Error message
    // Format: "purchase_required|<skuId>|<iapProductId>|<price>"
    const parts = msg.split('|')
    if (parts.length >= 4) {
      return {
        purchaseRequired: {
          skuId: parts[1] ?? '',
          iapProductId: parts[2] ?? '',
          price: parts[3] ?? '',
        },
      }
    }
    return { purchaseRequired: { iapProductId: '', price: '', skuId: '' } }
  }

  // Guard block (duplicate entry, rate blocked, etc.)
  if (msg.includes('guard_')) {
    // API returns JSON { error: 'guard_blocked', guardKey: 'guard_chart', reason: '...' }
    // Parse it properly to get the specific guardKey, not the generic 'guard_blocked' error code.
    try {
      const parsed = JSON.parse(msg) as Record<string, unknown>
      if (typeof parsed.guardKey === 'string') return { guardKey: parsed.guardKey }
    } catch {
      // not JSON — fall through to regex
    }
    // Fallback: skip 'guard_blocked' (generic error label), prefer specific keys
    const specific = msg.match(/guard_(?!blocked)\w+/)
    const fallback = msg.match(/guard_\w+/)
    return { guardKey: specific?.[0] ?? fallback?.[0] ?? 'guard_chart' }
  }

  return null
}

// ── Paywall / guard state hook ───────────────────────────────

interface PaywallState {
  guard: GuardState | null
}

export function usePaywall() {
  const [state, setState] = useState<PaywallState>({ guard: null })

  /** Full-screen Unlock flow — same route as DevTools "Open Paywall". */
  const showPaywallModal = useCallback(() => {
    router.push('/paywall')
  }, [])

  const dismissGuard = useCallback(() => {
    setState((prev) => ({ ...prev, guard: null }))
  }, [])

  const handleApiError = useCallback((err: unknown): boolean => {
    const guardState = parseGuardError(err)
    if (guardState) {
      if (guardState.needsUpgrade) {
        router.push('/paywall')
        setState({ guard: null })
      } else {
        setState((prev) => ({ ...prev, guard: guardState }))
      }
      return true
    }
    return false
  }, [])

  return {
    guard: state.guard,
    showPaywallModal,
    dismissGuard,
    handleApiError,
  }
}

// ── Free monthly divination quota ────────────────────────────

/** Shape returned by GET /api/quota/free */
export interface FreeQuotaStatus {
  divination: {
    usedThisMonth: number
    limit: number
    remaining: number
    creditsRemaining: number
  }
}

async function fetchFreeQuota(userId: string): Promise<FreeQuotaStatus> {
  const path = '/api/quota/free'
  const url = `${config.apiUrl}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${userId}`,
  }
  const sig = await signRequest({ body: '', userId, method: 'GET', path })
  if (sig) Object.assign(headers, sig)

  const res = await fetch(url, { headers })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(`free-quota:${res.status}:${data.error ?? ''}`)
  }
  return res.json() as Promise<FreeQuotaStatus>
}

export function useFreeQuotaQuery(userId: string | null | undefined) {
  return useQuery<FreeQuotaStatus>({
    queryKey: ['quota-free', userId],
    queryFn: () => fetchFreeQuota(userId!),
    enabled: !!userId && !userId.startsWith('guest_'),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  })
}

// ── Legacy compat re-export ───────────────────────────────────
// Kept so existing screens that import useQuota() still compile.

export function useQuota() {
  const paywall = usePaywall()
  return {
    checking: false,
    showPaywallModal: paywall.showPaywallModal,
    quota: null,
    guard: paywall.guard,
    // Legacy per-type checks are no-ops; billing is now server-side.
    checkYiChingQuota: async (_userId: string) => true,
    checkStellarQuota: async (_userId: string) => true,
    dismissGuard: paywall.dismissGuard,
    handleApiError: paywall.handleApiError,
  }
}
