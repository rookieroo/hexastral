/**
 * Single-purchase routes
 *
 * GET  /purchase/available/:skuId — check if user has an available (unconsumed) single purchase
 * POST /purchase/consume           — mark a purchase as consumed and link to a reading record
 *
 * These endpoints are called by the iOS client:
 *   - After RevenueCat `purchasePackage()` completes, poll `available` until webhook delivers
 *   - After a reading is successfully generated, call `consume` to link & mark used
 */

import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import { singlePurchases } from '../db/schema'
import type { AppEnv } from '../infra-types'
import { requireUserId } from '../lib/auth'

export const purchaseRoutes = new Hono<AppEnv>()

const VALID_SKU_IDS = [
  'cast',
  'fate_reading',
  'compatibility',
  'feng_analysis',
  'feng_analysis_villa_s',
  'feng_analysis_villa_l',
] as const
type SingleSkuId = (typeof VALID_SKU_IDS)[number]

/**
 * GET /purchase/available/:skuId
 * Returns whether the authenticated user has an unconsumed single purchase for the given SKU.
 */
purchaseRoutes.get('/available/:skuId', async (c) => {
  const userId = requireUserId(c)
  const skuId = c.req.param('skuId') as SingleSkuId

  if (!VALID_SKU_IDS.includes(skuId)) {
    throw new HTTPException(400, { message: `Invalid skuId: ${skuId}` })
  }

  const db = c.get('db')
  const purchase = await db
    .select({ id: singlePurchases.id })
    .from(singlePurchases)
    .where(
      and(
        eq(singlePurchases.userId, userId),
        eq(singlePurchases.skuId, skuId),
        eq(singlePurchases.status, 'purchased')
      )
    )
    .get()

  return c.json({
    available: !!purchase,
    purchaseId: purchase?.id ?? null,
  })
})

const consumeSchema = z.object({
  purchaseId: z.string().min(1),
  readingId: z.string().min(1),
})

/**
 * POST /purchase/consume
 * Marks a single purchase as consumed and links it to the generated reading record.
 * Called by client after the reading API call succeeds.
 */
purchaseRoutes.post('/consume', async (c) => {
  const userId = requireUserId(c)
  const body = await c.req.json()
  const { purchaseId, readingId } = consumeSchema.parse(body)

  const db = c.get('db')

  // Existence / ownership check (for the 404 vs 403 distinction).
  const purchase = await db
    .select({ status: singlePurchases.status, userId: singlePurchases.userId })
    .from(singlePurchases)
    .where(eq(singlePurchases.id, purchaseId))
    .get()

  if (!purchase) throw new HTTPException(404, { message: 'Purchase not found' })
  if (purchase.userId !== userId) throw new HTTPException(403, { message: 'Forbidden' })

  // Atomic consume (ADR-0013 P3): only the request that flips 'purchased'→'consumed'
  // wins, so two concurrent consumes can't both spend the same purchase. The prior
  // read-then-write had a double-spend race.
  const consumed = await db
    .update(singlePurchases)
    .set({ status: 'consumed', readingId, consumedAt: new Date().toISOString() })
    .where(
      and(
        eq(singlePurchases.id, purchaseId),
        eq(singlePurchases.userId, userId),
        eq(singlePurchases.status, 'purchased')
      )
    )
    .returning({ id: singlePurchases.id })

  if (consumed.length === 0) {
    return c.json({ consumed: false, reason: 'already_consumed' }, 409)
  }

  return c.json({ consumed: true, purchaseId, readingId })
})
