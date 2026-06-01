/**
 * 六十四卦数据查询路由 — 代理至 svc-astro
 */

import { Hono } from 'hono'
import type { AppEnv } from '../../infra-types'
import { callAstroGet } from '../../lib/astro-client'

export const hexagramRoutes = new Hono<AppEnv>()

  /** 获取全部 64 卦列表（精简） */
  .get('/', async (c) => {
    const list = await callAstroGet<unknown[]>(c.env.SVC_ASTRO, '/yiching/hexagrams')
    return c.json({ data: list })
  })

  /** 获取单卦详情 */
  .get('/:number', async (c) => {
    const num = Number.parseInt(c.req.param('number'), 10)
    if (Number.isNaN(num) || num < 1 || num > 64) {
      return c.json({ error: 'Invalid hexagram number (1-64)' }, 400)
    }

    const hexagram = await callAstroGet<Record<string, unknown>>(
      c.env.SVC_ASTRO,
      `/yiching/hexagrams/${num}`
    )

    return c.json({ data: hexagram })
  })

  /** 获取八卦信息 */
  .get('/trigrams/all', async (c) => {
    const trigrams = await callAstroGet<unknown[]>(c.env.SVC_ASTRO, '/yiching/trigrams')
    return c.json({ data: trigrams })
  })
