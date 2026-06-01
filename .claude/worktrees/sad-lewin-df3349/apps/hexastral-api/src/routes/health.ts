import { Hono } from 'hono'
import type { AppEnv } from '../infra-types'

export const healthRoutes = new Hono<AppEnv>().get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'hexastral-api',
    timestamp: new Date().toISOString(),
  })
})
