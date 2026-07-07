/**
 * Unit tests for Fēng bundled chat access.
 */

import { describe, expect, test } from 'bun:test'
import { checkFengChatAccess } from './feng-chat-access'

type MockDb = {
  select: (fields: unknown) => {
    from: (table: unknown) => {
      where: (cond: unknown) => { get: () => Promise<unknown> }
    }
  }
}

function mockDb(handlers: {
  report?: { chapters: string } | null
  subscription?: boolean
  consumedPurchase?: boolean
}): MockDb {
  let call = 0
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          get: async () => {
            call += 1
            if (call === 1) return handlers.report ?? null
            if (call === 2) return handlers.consumedPurchase ? { id: 'sp1' } : undefined
            return undefined
          },
        }),
      }),
    }),
  }
}

describe('checkFengChatAccess', () => {
  test('dev pro bypass grants access', async () => {
    const db = mockDb({ report: null })
    const result = await checkFengChatAccess(db as never, 'u1', 'r1', { devPro: true })
    expect(result.granted).toBe(true)
  })

  test('pending analyze blocks chat', async () => {
    const db = mockDb({ report: { chapters: '[]' } })
    const result = await checkFengChatAccess(db as never, 'u1', 'r1')
    expect(result.granted).toBe(false)
    if (!result.granted) expect(result.code).toBe('FENG_ANALYZE_PENDING')
  })

  test('missing report returns not_found', async () => {
    const db = mockDb({ report: null })
    const result = await checkFengChatAccess(db as never, 'u1', 'r1')
    expect(result.granted).toBe(false)
    if (!result.granted) expect(result.code).toBe('not_found')
  })
})
