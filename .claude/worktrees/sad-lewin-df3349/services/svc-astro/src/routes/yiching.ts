/**
 * 易经占卜 HTTP 端点
 */

import { Hono } from 'hono'
import type { Env } from '../types'
import { performDivination } from '../services/yiching/divination'
import { getHexagramByNumber, HEXAGRAMS, TRIGRAMS } from '../data/hexagrams'

type AppEnv = { Bindings: Env }

export const yichingRoutes = new Hono<AppEnv>()

/** POST /cast — 起卦 + AI解读 */
yichingRoutes.post('/cast', async (c) => {
  const input = await c.req.json()

  const reading = await performDivination(
    c.env,
    {
      question: input.question,
      entropy: input.entropy,
      userId: input.userId,
      language: input.language,
      method: input.method,
      yaoValues: input.yaoValues,
      memoryContext:
        typeof input.memoryContext === 'string' && input.memoryContext.trim().length > 0
          ? input.memoryContext.trim()
          : undefined,
    },
    input.isPro ?? false,
  )

  return c.json(reading)
})

/** GET /hexagrams — 六十四卦列表 */
yichingRoutes.get('/hexagrams', (c) => {
  return c.json(HEXAGRAMS)
})

/** GET /hexagrams/:number — 单卦查询 */
yichingRoutes.get('/hexagrams/:number', (c) => {
  const num = Number.parseInt(c.req.param('number'), 10)
  const hexagram = getHexagramByNumber(num)
  if (!hexagram) {
    return c.json({ error: 'Hexagram not found' }, 404)
  }
  return c.json(hexagram)
})

/** GET /trigrams — 八卦数据 */
yichingRoutes.get('/trigrams', (c) => {
  return c.json(TRIGRAMS)
})
