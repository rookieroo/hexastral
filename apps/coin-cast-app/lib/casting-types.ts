export type YaoTotal = 6 | 7 | 8 | 9

export interface YaoResult {
  coins: [2 | 3, 2 | 3, 2 | 3]
  total: YaoTotal
}

/** Physics settled: normal line, or traditional 「外应」— void whole hexagram and restart from line 1. */
export type PhysicsSettlePayload = { kind: 'line'; result: YaoResult } | { kind: 'wa_ying' }
