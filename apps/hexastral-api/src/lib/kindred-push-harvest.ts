/**
 * ADR-0025 / push-retention: persist relationship push snippets onto
 * `kindred_push_queue` with bondId + caps. Send path never calls LLM.
 */
import { and, eq, inArray } from 'drizzle-orm'
import { kindredPushQueue } from '../db/schema'
import type { AppDb } from '../infra-types'

export type KindredPushSnippetIn = {
  trigger: string
  title: string
  body: string
  /** Optional YYYY-MM-DD for dated rows. */
  fireOn?: string | null
}

const PER_BOND_CAP = 5
const PER_USER_CAP = 20
const VALID_TRIGGER = new Set(['resonance', 'tension', 'neutral'])

export async function harvestKindredPushSnippets(
  db: AppDb,
  opts: {
    userId: string
    bondId: string | null
    sourceReadingId: string
    locale: string
    snippets: KindredPushSnippetIn[]
    source?: 'report' | 'timeline' | 'whatif' | 'planner' | 'template'
  }
): Promise<number> {
  const cleaned = opts.snippets
    .map((s) => ({
      trigger: VALID_TRIGGER.has(s.trigger) ? s.trigger : 'neutral',
      title: s.title.trim(),
      body: s.body.trim(),
      fireOn: s.fireOn && /^\d{4}-\d{2}-\d{2}$/.test(s.fireOn) ? s.fireOn : null,
    }))
    .filter((s) => s.title && s.body)
    .slice(0, 6)
  if (cleaned.length === 0) return 0

  if (opts.bondId) {
    const bondQueued = await db
      .select({ id: kindredPushQueue.id })
      .from(kindredPushQueue)
      .where(
        and(
          eq(kindredPushQueue.userId, opts.userId),
          eq(kindredPushQueue.bondId, opts.bondId),
          eq(kindredPushQueue.status, 'queued')
        )
      )
    const overflow = bondQueued.length + cleaned.length - PER_BOND_CAP
    if (overflow > 0) {
      const toExpire = bondQueued.slice(0, overflow).map((r) => r.id)
      if (toExpire.length > 0) {
        await db
          .update(kindredPushQueue)
          .set({ status: 'expired' })
          .where(inArray(kindredPushQueue.id, toExpire))
      }
    }
  }

  const userQueued = await db
    .select({ id: kindredPushQueue.id })
    .from(kindredPushQueue)
    .where(and(eq(kindredPushQueue.userId, opts.userId), eq(kindredPushQueue.status, 'queued')))
  const userOverflow = userQueued.length + cleaned.length - PER_USER_CAP
  if (userOverflow > 0) {
    const toExpire = userQueued.slice(0, userOverflow).map((r) => r.id)
    if (toExpire.length > 0) {
      await db
        .update(kindredPushQueue)
        .set({ status: 'expired' })
        .where(inArray(kindredPushQueue.id, toExpire))
    }
  }

  await db.insert(kindredPushQueue).values(
    cleaned.map((s) => ({
      id: crypto.randomUUID(),
      userId: opts.userId,
      bondId: opts.bondId,
      sourceReadingId: opts.sourceReadingId,
      locale: opts.locale,
      kind: (s.fireOn ? 'dated' : 'conditional') as 'dated' | 'conditional',
      triggerKind: s.fireOn ? null : s.trigger,
      fireOn: s.fireOn,
      title: s.title,
      body: s.body,
      source: opts.source ?? ('report' as const),
      status: 'queued' as const,
    }))
  )
  return cleaned.length
}

/** Expire all queued snippets for a soft-deleted bond (stop pushes to removed relations). */
export async function expireKindredPushForBond(db: AppDb, bondId: string): Promise<number> {
  const rows = await db
    .select({ id: kindredPushQueue.id })
    .from(kindredPushQueue)
    .where(and(eq(kindredPushQueue.bondId, bondId), eq(kindredPushQueue.status, 'queued')))
  if (rows.length === 0) return 0
  const ids = rows.map((r) => r.id)
  await db
    .update(kindredPushQueue)
    .set({ status: 'expired' })
    .where(inArray(kindredPushQueue.id, ids))
  return ids.length
}
