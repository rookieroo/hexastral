/**
 * Optional Cloudflare AI Search for portfolio reading recall.
 * Bind `PORTFOLIO_MEMORY_AI_SEARCH` (ai_search instance) in wrangler when an instance exists; otherwise all calls no-op.
 *
 * Targets:
 *   - 'hexastral' — flagship 命Kindred卦道 readings (natal / stellar / yiching / pair / physiognomy / report)
 *   - 'coincast'  — CoinCast satellite (yi-ching style daily question)
 *   - 'dreamoracle' — DreamOracle satellite (dream interpretation)
 */

import type { CloudflareBindings } from '../infra-types'
import { apiLogger } from './logger'

const memoryLogger = apiLogger.child({ domain: 'portfolio-memory' })

export type PortfolioMemoryTargetApp = 'hexastral' | 'coincast' | 'dreamoracle' | 'numerology'

function getMemoryInstance(env: CloudflareBindings) {
  return env.PORTFOLIO_MEMORY_AI_SEARCH ?? null
}

export function buildPortfolioMemoryItemKey(userId: string, readingId: string): string {
  return `pf_mem_v1_${userId}_${readingId}.md`
}

function userTargetKey(userId: string, targetApp: PortfolioMemoryTargetApp): string {
  return `${userId}:${targetApp}`
}

export async function searchPortfolioReadingMemory(
  env: CloudflareBindings,
  params: {
    userId: string
    targetApp: PortfolioMemoryTargetApp
    query: string
    requestId?: string
    locale?: string
    /** When true, recall across ALL of this user's apps (not just targetApp). */
    crossApp?: boolean
  }
): Promise<{ context: string; hitCount: number }> {
  const inst = getMemoryInstance(env)
  const q = params.query.trim()
  if (!inst || q.length < 2) {
    return { context: '', hitCount: 0 }
  }

  const started = Date.now()
  try {
    const res = await inst.search({
      query: q.slice(0, 500),
      ai_search_options: {
        retrieval: {
          max_num_results: 5,
          match_threshold: 0.35,
          // Cross-app recall matches every target for this user via the
          // standalone `user_id` metadata field ($like is unsupported); same-app
          // recall stays scoped to the combined user_target key.
          filters: params.crossApp
            ? { user_id: { $eq: params.userId } }
            : { user_target: { $eq: userTargetKey(params.userId, params.targetApp) } },
          return_on_failure: true,
        },
      },
    })
    const chunks = res.chunks ?? []
    const body = chunks
      .slice(0, 5)
      .map((chunk: { text: string }, i: number) => `[${i + 1}] ${chunk.text}`.trim())
      .join('\n')

    const hitCount = chunks.length
    memoryLogger.info('ai_search.search.done', {
      targetApp: params.targetApp,
      hitCount,
      durationMs: Date.now() - started,
      ...(params.requestId ? { requestId: params.requestId } : {}),
    })

    const zh = (params.locale ?? 'en').startsWith('zh')
    let prefix: string
    if (params.targetApp === 'coincast') {
      prefix = zh
        ? '以下为该用户过往占问的可检索摘要（仅供语境，不得改写卦象与爻位；若为空则忽略）：'
        : 'Retrieved excerpts from this querent’s prior CoinCast notes (context only; do not contradict the cast lines or hexagram facts; ignore if empty):'
    } else if (params.targetApp === 'dreamoracle') {
      prefix = zh
        ? '以下为该用户过往梦境记录的可检索摘要（仅供语境；若为空则忽略）：'
        : 'Retrieved excerpts from this dreamer’s prior dream notes (context only; ignore if empty):'
    } else {
      prefix = zh
        ? '以下为该用户过往命理解读的可检索摘要（仅供语境，不得改写命盘事实；若为空则忽略）：'
        : 'Retrieved excerpts from this user’s prior HexAstral readings (context only; do not invent chart facts; ignore if empty):'
    }

    return {
      context: body.length > 0 ? `${prefix}\n${body}` : '',
      hitCount,
    }
  } catch (err) {
    memoryLogger.warn('ai_search.search.failed', {
      targetApp: params.targetApp,
      durationMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
      ...(params.requestId ? { requestId: params.requestId } : {}),
    })
    return { context: '', hitCount: 0 }
  }
}

export async function indexPortfolioReadingMemory(
  env: CloudflareBindings,
  row: {
    userId: string
    readingId: string
    targetApp: PortfolioMemoryTargetApp
    locale: string
    bodyMarkdown: string
  }
): Promise<void> {
  const inst = getMemoryInstance(env)
  if (!inst) return

  const name = buildPortfolioMemoryItemKey(row.userId, row.readingId)
  try {
    await inst.items.upload(name, row.bodyMarkdown, {
      metadata: {
        user_target: userTargetKey(row.userId, row.targetApp),
        // Standalone user id so cross-app recall (CC.4) can $eq across targets.
        user_id: row.userId,
        reading_id: row.readingId,
        locale: row.locale,
      },
    })
    memoryLogger.info('ai_search.index.done', {
      readingId: row.readingId,
      targetApp: row.targetApp,
    })
  } catch (err) {
    memoryLogger.warn('ai_search.index.failed', {
      readingId: row.readingId,
      targetApp: row.targetApp,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function deletePortfolioReadingMemory(
  env: CloudflareBindings,
  userId: string,
  readingId: string
): Promise<void> {
  const inst = getMemoryInstance(env)
  if (!inst) return

  try {
    const list = await inst.items.list({ search: readingId, per_page: 30 })
    const rows = list.result ?? []
    const needle = `_${userId}_${readingId}`
    for (const item of rows) {
      if (typeof item.key === 'string' && item.key.includes(needle) && item.id) {
        await inst.items.delete(item.id)
      }
    }
    memoryLogger.info('ai_search.delete.done', { readingId })
  } catch (err) {
    memoryLogger.warn('ai_search.delete.failed', {
      readingId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

export function buildCoincastMemoryDocument(input: {
  readingId: string
  question: string
  summary: string
  interpretation: string
  hexName: string
  hexNumber: number
}): string {
  const interp = input.interpretation.slice(0, 900)
  return [
    `# CoinCast ${input.readingId}`,
    `Hexagram: ${input.hexNumber} ${input.hexName}`,
    `Question: ${input.question}`,
    `Summary: ${input.summary}`,
    '',
    'Interpretation excerpt:',
    interp,
  ].join('\n')
}

export function buildHexastralMemoryDocument(input: {
  readingId: string
  readingType: 'natal' | 'stellar' | 'yiching' | 'pair' | 'physiognomy' | 'report'
  title: string
  summary?: string
  interpretation: string
}): string {
  const interp = input.interpretation.slice(0, 900)
  const lines = [`# HexAstral ${input.readingType} ${input.readingId}`, `Title: ${input.title}`]
  if (input.summary) lines.push(`Summary: ${input.summary.slice(0, 240)}`)
  lines.push('', 'Interpretation excerpt:', interp)
  return lines.join('\n')
}

export function buildDreamMemoryDocument(input: {
  readingId: string
  dreamText: string
  interpretation: string
}): string {
  const dream = input.dreamText.slice(0, 900)
  const interp = input.interpretation.slice(0, 900)
  return [
    `# Dream ${input.readingId}`,
    'Dream excerpt:',
    dream,
    '',
    'Interpretation excerpt:',
    interp,
  ].join('\n')
}

/**
 * 梅花易数 (Numerology satellite) — the memory document captures the cast
 * hexagram + 体卦/用卦 + 互卦 so HexAstral chat can recall "what hexagram did
 * the user cast for X question?" without re-running the cast.
 */
const TRIGRAM_NAME_BY_NUMBER: Record<number, string> = {
  1: '乾',
  2: '兑',
  3: '离',
  4: '震',
  5: '巽',
  6: '坎',
  7: '艮',
  8: '坤',
}

export function buildNumerologyMemoryDocument(input: {
  readingId: string
  question: string | null
  observedNumber: number
  upperNumber: number
  lowerNumber: number
  changingLineNumber: number
  bodyTrigramNumber: number
  useTrigramNumber: number
  nuclearUpperNumber: number
  nuclearLowerNumber: number
  castAt: string
}): string {
  const name = (n: number) => TRIGRAM_NAME_BY_NUMBER[n] ?? '?'
  return [
    `# Meihua (Numerology satellite) ${input.readingId}`,
    input.question ? `Question: ${input.question}` : 'Question: (none — time-only cast)',
    `Observed number: ${input.observedNumber}`,
    `Cast at: ${input.castAt}`,
    '',
    `Upper trigram: ${name(input.upperNumber)} (${input.upperNumber})`,
    `Lower trigram: ${name(input.lowerNumber)} (${input.lowerNumber})`,
    `Changing line (动爻): ${input.changingLineNumber}`,
    '',
    `Subject (体卦): ${name(input.bodyTrigramNumber)} (${input.bodyTrigramNumber})`,
    `Object (用卦): ${name(input.useTrigramNumber)} (${input.useTrigramNumber})`,
    '',
    'Nuclear hexagram (互卦):',
    `  Upper: ${name(input.nuclearUpperNumber)} (${input.nuclearUpperNumber})`,
    `  Lower: ${name(input.nuclearLowerNumber)} (${input.nuclearLowerNumber})`,
  ].join('\n')
}
