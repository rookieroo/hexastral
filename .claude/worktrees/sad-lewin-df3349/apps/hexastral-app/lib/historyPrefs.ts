/**
 * Persists History screen segment / Fate sub-tab / view mode across pushes (e.g. detail → back).
 */

import { storage } from '@/lib/storage'

const KEY = 'history_screen_prefs_v1'

export type HistorySegment = 'oracle' | 'fate'
export type FateHistorySub = 'daily' | 'readings'
export type HistoryViewMode = 'list' | 'calendar'

export interface HistoryScreenPrefs {
  segment: HistorySegment
  fateSub: FateHistorySub
  viewMode: HistoryViewMode
}

const DEFAULTS: HistoryScreenPrefs = {
  segment: 'oracle',
  fateSub: 'readings',
  viewMode: 'list',
}

/** Deep-link / Settings entry — locks History chrome when present in URL. */
export type HistoryEntryScope = 'oracle' | 'daily' | 'readings'

export function parseHistoryEntryScope(raw: string | string[] | undefined): HistoryEntryScope | null {
  const v = Array.isArray(raw) ? raw[0] : raw
  if (v === 'oracle' || v === 'daily' || v === 'readings') return v
  return null
}

export function historyHref(scope: HistoryEntryScope): string {
  return `/(settings)/history?historyScope=${scope}`
}

export function loadHistoryPrefs(): HistoryScreenPrefs {
  try {
    const raw = storage.getString(KEY)
    if (!raw) return DEFAULTS
    const p = JSON.parse(raw) as Partial<HistoryScreenPrefs>
    return {
      segment: p.segment === 'fate' ? 'fate' : 'oracle',
      fateSub: p.fateSub === 'readings' ? 'readings' : 'daily',
      viewMode: p.viewMode === 'calendar' ? 'calendar' : 'list',
    }
  } catch {
    return DEFAULTS
  }
}

export function saveHistoryPrefs(p: HistoryScreenPrefs): void {
  storage.set(KEY, JSON.stringify(p))
}
