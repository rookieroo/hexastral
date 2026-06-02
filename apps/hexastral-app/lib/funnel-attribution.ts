/**
 * Captures `<scheme>://onboard?from=<satellite>&signal=<question>&ddl=<token>`
 * deep links from satellite apps and persists them for onboarding personalization
 * + funnel analytics. The DDL token itself is handled by the existing DDL flow
 * (lib/domain/ddl.ts).
 *
 * Shared key `flagship_funnel_attribution` — same constant lives in
 * yuan-app and feng-app; keep in sync until extracted to a shared package.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Linking from 'expo-linking'

export interface FlagshipFunnelAttribution {
  from: string
  signal: string | null
  ddlToken: string | null
  arrivedAt: string
}

const STORAGE_KEY = 'flagship_funnel_attribution'

function parseOnboardUrl(url: string): FlagshipFunnelAttribution | null {
  try {
    const parsed = Linking.parse(url)
    if (parsed.hostname !== 'onboard' && parsed.path !== 'onboard') return null
    const q = parsed.queryParams ?? {}
    const from = typeof q.from === 'string' ? q.from : null
    if (!from) return null
    const signal = typeof q.signal === 'string' ? q.signal : null
    const ddlToken = typeof q.ddl === 'string' ? q.ddl : null
    return { from, signal, ddlToken, arrivedAt: new Date().toISOString() }
  } catch {
    return null
  }
}

export async function captureOnboardAttribution(url: string | null): Promise<void> {
  if (!url) return
  const attribution = parseOnboardUrl(url)
  if (!attribution) return
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(attribution))
  } catch {
    // Best-effort — never block deep-link handling on AsyncStorage errors
  }
}

export async function getFlagshipAttribution(): Promise<FlagshipFunnelAttribution | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as FlagshipFunnelAttribution
  } catch {
    return null
  }
}

export async function clearFlagshipAttribution(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
