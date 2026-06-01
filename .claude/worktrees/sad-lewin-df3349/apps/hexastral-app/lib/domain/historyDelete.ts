/**
 * Delete single rows from 命册 lists (server-backed).
 */

import { apiClient } from '@/lib/api'

/** Pair reading delete blocked by an existing Cosmic Bond FK (HTTP 409). */
export class HistoryDeleteBondLinkedError extends Error {
  constructor() {
    super('pair_reading_linked_to_bond')
    this.name = 'HistoryDeleteBondLinkedError'
  }
}

export async function deleteDivinationRecord(id: string): Promise<void> {
  const res = await apiClient.api.yiching.divination[':id'].$delete({ param: { id } })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`delete divination failed: ${res.status} ${text}`)
  }
}

export async function deleteDailySignalRecord(signalId: string): Promise<void> {
  const res = await apiClient.api.signal.item[':signalId'].$delete({ param: { signalId } })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`delete signal failed: ${res.status} ${text}`)
  }
}

export async function deletePairHistoryRecord(id: string): Promise<void> {
  const res = await apiClient.api.pair[':id'].$delete({ param: { id } })
  if (res.status === 409) {
    throw new HistoryDeleteBondLinkedError()
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`delete pair failed: ${res.status} ${text}`)
  }
}
