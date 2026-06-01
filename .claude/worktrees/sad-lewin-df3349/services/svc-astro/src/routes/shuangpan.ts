/**
 * 双盘合参 HTTP 端点
 */

import { Hono } from 'hono'
import { generateNatalChart } from '../services/natal/natal'
import { generateDualReading } from '../services/shuangpan/dual-call'
import { runShuangPan } from '../services/shuangpan/shuangpan'
import { generateChart } from '../services/stellar/stellar'
import type { Env } from '../types'

type AppEnv = { Bindings: Env }

export const shuangpanRoutes = new Hono<AppEnv>()

/** POST /analyze — 双盘排盘 + 共识引擎 + AI解读 (Gemini Flash dual-call) */
shuangpanRoutes.post('/analyze', async (c) => {
  const input = await c.req.json()

  // 1. 命格排盘
  const natalChart = generateNatalChart(input)

  // 2. 星宫排盘
  const { palaces, meta, chart: stellarChart } = generateChart(input)

  // 3. 共识引擎
  const [yearStr, monthStr, dayStr] = input.solarDate.split('-')
  const birthInfo = {
    year: Number.parseInt(yearStr!, 10),
    month: Number.parseInt(monthStr!, 10),
    day: Number.parseInt(dayStr!, 10),
  }
  const consensus = runShuangPan(
    natalChart,
    stellarChart.palaces as never,
    input.queryYear,
    birthInfo
  )

  // 4. Dual-call AI 解读 (structured + creative hooks)
  let aiReading: string | null = null
  let hooks: Awaited<ReturnType<typeof generateDualReading>>['hooks'] = null
  let shareQuote: string | undefined
  try {
    const result = await generateDualReading(
      c.env,
      consensus,
      input.queryYear,
      input.isPro ?? false,
      input.language ?? 'zh-CN',
      {
        solarBirthDate: input.solarDate,
        physiognomyFeaturesJson: input.physiognomyFeaturesJson ?? null,
        readingMode: input.readingMode ?? 'beginner',
      }
    )
    aiReading = result.aiReading
    hooks = result.hooks
    shareQuote = result.shareQuote
  } catch (err) {
    console.error('[svc-astro/shuangpan] AI reading failed:', err)
  }

  return c.json({ natalChart, palaces, meta, consensus, aiReading, hooks, shareQuote })
})

/**
 * POST /analyze-stream — SSE variant of /analyze.
 *
 * Emits progressive events so the client can render chart immediately
 * while the AI reading is still generating:
 *   event: chart       data: { natalChart, palaces, meta }
 *   event: consensus   data: { consensus }
 *   event: reading     data: { aiReading, hooks, shareQuote }      // reading complete
 *   event: error       data: { message }                            // on AI failure (chart still useful)
 *   event: done        data: {}
 */
shuangpanRoutes.post('/analyze-stream', async (c) => {
  const input = await c.req.json()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        // 1. 命格排盘 + 星宫排盘 (synchronous, ~ms)
        const natalChart = generateNatalChart(input)
        const { palaces, meta, chart: stellarChart } = generateChart(input)
        send('chart', { natalChart, palaces, meta })

        // 2. 共识引擎
        const [yearStr, monthStr, dayStr] = input.solarDate.split('-')
        const birthInfo = {
          year: Number.parseInt(yearStr!, 10),
          month: Number.parseInt(monthStr!, 10),
          day: Number.parseInt(dayStr!, 10),
        }
        const consensus = runShuangPan(
          natalChart,
          stellarChart.palaces as never,
          input.queryYear,
          birthInfo
        )
        send('consensus', { consensus })

        // 3. AI dual-call (the slow step — single emit on completion)
        try {
          const result = await generateDualReading(
            c.env,
            consensus,
            input.queryYear,
            input.isPro ?? false,
            input.language ?? 'zh-CN',
            {
              solarBirthDate: input.solarDate,
              physiognomyFeaturesJson: input.physiognomyFeaturesJson ?? null,
              readingMode: input.readingMode ?? 'beginner',
            }
          )
          send('reading', {
            aiReading: result.aiReading,
            hooks: result.hooks,
            shareQuote: result.shareQuote,
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error('[svc-astro/shuangpan/stream] AI reading failed:', msg)
          send('error', { message: msg })
        }

        send('done', {})
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[svc-astro/shuangpan/stream] fatal:', msg)
        send('error', { message: msg })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
})
