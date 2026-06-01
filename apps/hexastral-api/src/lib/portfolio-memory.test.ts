import { describe, expect, it } from 'bun:test'
import {
  buildHexastralMemoryDocument,
  buildPortfolioMemoryItemKey,
  searchPortfolioReadingMemory,
} from './portfolio-memory'

describe('portfolio-memory', () => {
  it('searchPortfolioReadingMemory no-ops when no PORTFOLIO_MEMORY_AI_SEARCH binding', async () => {
    const env = {} as any
    const out = await searchPortfolioReadingMemory(env, {
      userId: 'u1',
      targetApp: 'hexastral',
      query: 'what is my element',
    })
    expect(out).toEqual({ context: '', hitCount: 0 })
  })

  it('searchPortfolioReadingMemory no-ops on too-short query', async () => {
    const env = { PORTFOLIO_MEMORY_AI_SEARCH: { search: () => ({ chunks: [] }) } } as any
    const out = await searchPortfolioReadingMemory(env, {
      userId: 'u1',
      targetApp: 'hexastral',
      query: 'a',
    })
    expect(out).toEqual({ context: '', hitCount: 0 })
  })

  it('searchPortfolioReadingMemory scopes filters by user_target so different users do not leak', async () => {
    const calls: Array<Record<string, unknown>> = []
    const env = {
      PORTFOLIO_MEMORY_AI_SEARCH: {
        search: (req: any) => {
          calls.push(req)
          return { chunks: [{ text: 'past natal note' }] }
        },
      },
    } as any

    await searchPortfolioReadingMemory(env, {
      userId: 'user-a',
      targetApp: 'hexastral',
      query: 'what is my element again?',
      locale: 'zh-CN',
    })
    await searchPortfolioReadingMemory(env, {
      userId: 'user-b',
      targetApp: 'hexastral',
      query: 'what is my element again?',
      locale: 'zh-CN',
    })

    expect(calls).toHaveLength(2)
    expect(calls[0]?.ai_search_options).toMatchObject({
      retrieval: {
        max_num_results: 5,
        match_threshold: 0.35,
        filters: { user_target: { $eq: 'user-a:hexastral' } },
      },
    })
    expect(calls[1]?.ai_search_options).toMatchObject({
      retrieval: { filters: { user_target: { $eq: 'user-b:hexastral' } } },
    })
  })

  it('searchPortfolioReadingMemory uses the hexastral-flagship prefix for non-satellite targets', async () => {
    const env = {
      PORTFOLIO_MEMORY_AI_SEARCH: {
        search: () => ({ chunks: [{ text: 'past reading' }] }),
      },
    } as any

    const zh = await searchPortfolioReadingMemory(env, {
      userId: 'u',
      targetApp: 'hexastral',
      query: 'what is my element',
      locale: 'zh-CN',
    })
    expect(zh.context).toContain('过往命理解读')
    expect(zh.context).toContain('past reading')

    const en = await searchPortfolioReadingMemory(env, {
      userId: 'u',
      targetApp: 'hexastral',
      query: 'what is my element',
      locale: 'en',
    })
    expect(en.context).toContain('prior HexAstral readings')
  })

  it('buildHexastralMemoryDocument produces a stable, length-capped markdown body', () => {
    const doc = buildHexastralMemoryDocument({
      readingId: 'r123',
      readingType: 'natal',
      title: 'Day Master Bing-Hu (火 strong)',
      summary: 'Yang fire on autumn earth — energy expressive but burns hot.',
      interpretation: 'a'.repeat(2000),
    })
    expect(doc).toContain('# HexAstral natal r123')
    expect(doc).toContain('Title: Day Master Bing-Hu')
    expect(doc).toContain('Summary: Yang fire on autumn earth')
    // interpretation excerpt clamped to 900 chars
    const interpLine = doc.split('\n').at(-1) ?? ''
    expect(interpLine.length).toBeLessThanOrEqual(900)
  })

  it('buildPortfolioMemoryItemKey is deterministic per user × reading', () => {
    expect(buildPortfolioMemoryItemKey('u1', 'r1')).toBe('pf_mem_v1_u1_r1.md')
    expect(buildPortfolioMemoryItemKey('u1', 'r1')).toBe(buildPortfolioMemoryItemKey('u1', 'r1'))
    expect(buildPortfolioMemoryItemKey('u1', 'r1')).not.toBe(
      buildPortfolioMemoryItemKey('u2', 'r1')
    )
  })
})
