/**
 * Optional Cloudflare AI Search for portfolio reading recall.
 * Bind `PORTFOLIO_MEMORY_AI_SEARCH` (ai_search instance) in wrangler when an instance exists; otherwise all calls no-op.
 *
 * Targets:
 *   - 'hexastral' — flagship 命緣卦道 readings (natal / stellar / yiching / pair / physiognomy / report)
 *   - 'coincast'  — CoinCast satellite (yi-ching style daily question)
 *   - 'dreamoracle' — DreamOracle satellite (dream interpretation)
 */

import type { CloudflareBindings } from '../infra-types'

export type PortfolioMemoryTargetApp = 'hexastral' | 'coincast' | 'dreamoracle'

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
  }
): Promise<{ context: string; hitCount: number }> {
  const inst = getMemoryInstance(env)
  const q = params.query.trim()
  if (!inst || q.length < 2) {
    return { context: '', hitCount: 0 }
  }

  try {
    const res = await inst.search({
      query: q.slice(0, 500),
      ai_search_options: {
        retrieval: {
          max_num_results: 5,
          match_threshold: 0.35,
          filters: {
            user_target: { $eq: userTargetKey(params.userId, params.targetApp) },
          },
          return_on_failure: true,
        },
      },
    })
    const chunks = res.chunks ?? []
    const body = chunks
      .slice(0, 5)
      .map((chunk, i) => `[${i + 1}] ${chunk.text}`.trim())
      .join('\n')

    const hitCount = chunks.length
    if (params.requestId) {
      console.log(
        JSON.stringify({
          event: 'portfolio_memory_search',
          requestId: params.requestId,
          targetApp: params.targetApp,
          hitCount,
        })
      )
    }

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
    console.warn('[portfolio-memory] search failed', err)
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
        reading_id: row.readingId,
        locale: row.locale,
      },
    })
    console.log(
      JSON.stringify({
        event: 'portfolio_memory_index',
        readingId: row.readingId,
        targetApp: row.targetApp,
      })
    )
  } catch (err) {
    console.warn('[portfolio-memory] index upload failed', err)
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
    console.log(
      JSON.stringify({
        event: 'portfolio_memory_delete',
        readingId,
      })
    )
  } catch (err) {
    console.warn('[portfolio-memory] delete failed', err)
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
  const lines = [
    `# HexAstral ${input.readingType} ${input.readingId}`,
    `Title: ${input.title}`,
  ]
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
