/**
 * 用户事件日志 — 已废弃 (userEvents 表已删除)
 *
 * logEvent 保留为 no-op 以避免修改所有调用方。
 */

export type EventType =
  | 'reading_stellar'
  | 'reading_natal'
  | 'reading_fate'
  | 'reading_shuangpan'
  | 'reading_pair'
  | 'analysis_physiognomy'
  | 'divination_yiching'
  | 'report_fate'
  | 'share_create'
  | 'share_revoke'
  | 'purchase_credits'
  | 'bond_create'
  | 'bond_invite_sent'
  | 'fortune_view'
  | 'almanac_view'

// biome-ignore lint/suspicious/noConfusingVoidType: intentional no-op stub
export async function logEvent(
  _db: unknown,
  _userId: string,
  _eventType: EventType,
  _metadata?: Record<string, unknown>
): Promise<void> {
  // no-op — user_events table dropped in migration 0017
}
