/**
 * svc-astro — 核心算力引擎 (内部 Worker)
 *
 * 星宫 / 命格 / 双盘 / 合婚 / 风水 / 面相 / 易经 的
 * 排盘计算 + Gemini AI 解读
 *
 * 无公网入口，仅通过 hexastral-api Service Binding 访问
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Env } from './types'
import { stellarRoutes } from './routes/stellar'
import { natalRoutes } from './routes/natal'
import { shuangpanRoutes } from './routes/shuangpan'
import { pairRoutes } from './routes/pair'
import { physiognomyRoutes } from './routes/physiognomy'
import { yichingRoutes } from './routes/yiching'
import { fateRoutes } from './routes/fate'
import { chatRoutes } from './routes/chat'
import { previewRoutes } from './routes/preview'
import { reportChapterRoutes } from './routes/report-chapter'
import { signalRoutes } from './routes/signal'
import { signatureRoutes } from './routes/signature'
import { staticChartRoutes } from './routes/static-chart'

type AppEnv = { Bindings: Env }

const app = new Hono<AppEnv>()

// Rate limiting middleware — defense-in-depth (30 req/min)
app.use('*', async (c, next) => {
  if (c.req.path === '/health') return next()
  const key = c.req.header('X-Request-User') ?? 'global'
  const { success } = await c.env.RATE_LIMITER.limit({ key })
  if (!success) throw new HTTPException(429, { message: 'Rate limited' })
  return next()
})

app.route('/stellar', stellarRoutes)
app.route('/natal', natalRoutes)
app.route('/shuangpan', shuangpanRoutes)
app.route('/pair', pairRoutes)
app.route('/physiognomy', physiognomyRoutes)
app.route('/yiching', yichingRoutes)
app.route('/fate', fateRoutes)
app.route('/chat', chatRoutes)
app.route('/ob', previewRoutes)   // POST /ob/preview — 新手引导命格预览（避免与 /natal 重名）
app.route('/chart', staticChartRoutes) // POST /chart/static — 0 LLM 全静态命盘 (Free 用户)
app.route('/signature', signatureRoutes) // POST /signature — Hero 命理签名生成
app.route('/signal', signalRoutes) // POST /signal/generate — Daily signal LLM enhancement
app.route('/report', reportChapterRoutes) // POST /report/chapter — Deep report chapter generation

app.get('/health', (c) => c.json({ status: 'ok', service: 'svc-astro' }))

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse()
  console.error('[svc-astro]', err)
  return c.json({ error: 'Internal server error' }, 500)
})

app.notFound((c) => c.json({ error: 'Not found' }, 404))

export default app
