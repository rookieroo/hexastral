/**
 * POST /form-li/interpret — mid-pass LLM after Vision + compute.
 * Failures are returned as { formLiNotes: null, failOpen: true } (caller fail-opens).
 */

import { callWithFallback, withZodRetry } from '@zhop/ai-vision'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { auditFormLiNotes } from '../lib/form-li-notes-audit'
import { fengBodyLooksWrongLocale } from '../lib/locale-gate'
import { logger } from '../lib/logger'
import { auditGeneratedOutput } from '../lib/output-audit'
import {
  buildFormLiUserPrompt,
  FORM_LI_RESPONSE_SCHEMA,
  FORM_LI_SYSTEM_PROMPT,
  FormLiNotesSchema,
} from '../prompts/form-li-notes'

const RequestSchema = z.object({
  compact: z.record(z.string(), z.unknown()),
  compute: z.record(z.string(), z.unknown()),
  locale: z.enum(['en', 'zh', 'zh-Hant', 'ja']),
})

const MODEL_VERSION = 'cf-kimi-formli-v1'
const WALL_MS = 25_000
const MAX_TOKENS = 2048

export const formLiRouter = new Hono<{ Bindings: Env }>()

formLiRouter.post('/interpret', async (c) => {
  const json = await c.req.json().catch(() => null)
  const parsed = RequestSchema.safeParse(json)
  if (!parsed.success) {
    throw new HTTPException(400, { message: parsed.error.message })
  }

  const { compact, compute, locale } = parsed.data
  const started = Date.now()
  logger.info('form_li.start', { locale })

  const userPrompt = buildFormLiUserPrompt(JSON.stringify(compact, null, 2), locale)
  let auditSuffix = ''
  let forbiddenSuffix = ''

  try {
    const notes = await withZodRetry({
      label: 'form_li',
      schema: FormLiNotesSchema,
      maxRetries: 2,
      call: async () => {
        const text = await callWithFallback(
          c.env,
          FORM_LI_SYSTEM_PROMPT,
          userPrompt + forbiddenSuffix + auditSuffix,
          {
            tier: 'flagship',
            responseSchema: FORM_LI_RESPONSE_SCHEMA as unknown as Record<string, unknown>,
            maxTokens: MAX_TOKENS,
            temperature: 0.35,
            metricLabel: 'feng-form-li',
            locale,
            totalBudgetMs: WALL_MS,
            perModelTimeoutMs: 20_000,
          }
        )
        const parsedJson = JSON.parse(text) as unknown
        const zod = FormLiNotesSchema.safeParse(parsedJson)
        if (!zod.success) {
          throw new Error(zod.error.message)
        }
        const forbid = auditGeneratedOutput(JSON.stringify(parsedJson))
        if (forbid.hits.length > 0) {
          forbiddenSuffix = forbid.rewriteSuffix ?? ''
          throw new Error('forbidden phrases in form_li output')
        }
        const audit = auditFormLiNotes(zod.data, compute)
        if (!audit.ok) {
          auditSuffix = audit.rewriteSuffix
          logger.warn('form_li.audit', { violations: audit.violations })
          throw new Error('form_li audit failed')
        }
        const noteBlob = zod.data.bullets.map((b) => `${b.seen}\n${b.linkToChart}`).join('\n')
        if (fengBodyLooksWrongLocale(locale, noteBlob)) {
          auditSuffix =
            '\n\nREWRITE REQUIRED — match locale; keep classical 汉字 terms sparse; prose in target language.'
          throw new Error('form_li locale gate failed')
        }
        return zod.data
      },
      degraded: () => {
        throw new Error('form_li degraded')
      },
    })

    logger.info('form_li.done', {
      locale,
      durationMs: Date.now() - started,
      bullets: notes.bullets.length,
      failOpen: false,
    })
    return c.json({
      formLiNotes: notes,
      failOpen: false,
      modelVersion: MODEL_VERSION,
    })
  } catch (err) {
    logger.warn('feng.mid_llm.fail_open', {
      locale,
      durationMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    })
    return c.json({
      formLiNotes: null,
      failOpen: true,
      modelVersion: `${MODEL_VERSION}-fail-open`,
    })
  }
})
