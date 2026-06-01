/**
 * useGlossaryQuery — 命盘术语词库查询 hook
 *
 * 批量获取多个 key 的长释义（用于入门模式展开卡片）。
 * 数据永不过期（staleTime 24h），离线可用（gcTime 7 days）。
 *
 * @example
 *   const { data } = useGlossaryQuery(['stem:甲', 'geju:正官格'], 'zh')
 *   data?.items.find(i => i.key === 'stem:甲')?.bodyMd
 */

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api'

export interface GlossaryItem {
  key: string
  category: string
  title: string
  bodyMd: string
}

// biome-ignore lint/suspicious/noExplicitAny: RPC type not yet regenerated in hexastral-client
type AnyApiClient = any

const GLOSSARY_LANGS: Record<string, 'zh' | 'zh-Hant' | 'en' | 'ja'> = {
  zh: 'zh',
  'zh-Hant': 'zh-Hant',
  en: 'en',
  ja: 'ja',
}

function toGlossaryLang(locale: string): 'zh' | 'zh-Hant' | 'en' | 'ja' {
  return GLOSSARY_LANGS[locale] ?? 'en'
}

export function useGlossaryQuery(keys: string[] | null, locale: string) {
  const lang = toGlossaryLang(locale)

  return useQuery({
    queryKey: ['glossary', keys?.sort().join(',') ?? '', lang],
    queryFn: async (): Promise<{ items: GlossaryItem[] }> => {
      if (!keys || keys.length === 0) return { items: [] }

      const resp = await (apiClient as AnyApiClient).api.glossary.$get({
        query: {
          keys: keys.join(','),
          lang,
        },
      })
      if (!resp.ok) return { items: [] }
      return (await resp.json()) as { items: GlossaryItem[] }
    },
    enabled: !!keys && keys.length > 0,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  })
}
