import { drizzle } from 'drizzle-orm/d1'
import { createMiddleware } from 'hono/factory'
import * as schema from '../db/schema'
import type { CloudflareBindings, ContextVariables } from '../infra-types'

/**
 * Injects a schema-aware Drizzle D1 instance into context.
 * Access via `c.get('db')` in any route handler.
 */
export const dbMiddleware = createMiddleware<{
  Bindings: CloudflareBindings
  Variables: ContextVariables
}>(async (c, next) => {
  c.set('db', drizzle(c.env.DB, { schema }))
  await next()
})
