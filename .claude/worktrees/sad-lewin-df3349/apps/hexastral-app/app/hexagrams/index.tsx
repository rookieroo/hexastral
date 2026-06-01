/**
 * 📚 六十四卦 — 卦象知识库
 *
 * 路由: /hexagrams (Modal stack)
 * 功能: 浏览 64 卦列表，点击查看详情
 */

import type { HexagramListItem } from '@zhop/hexastral-client'
import { FORTUNE_LABELS } from '@zhop/hexastral-tokens/constants/fortune'
import { HEXAGRAM_LIST } from '@zhop/hexastral-tokens/constants/hexagram'
import { useRouter } from 'expo-router'
import { Search } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BackButton } from '@/components/ui/BackButton'
import { apiClient } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { fortuneColors, theme } from '@/lib/theme'

export default function HexagramListScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const colors = colorScheme === 'dark' ? theme.dark : theme.light
  const { t } = useI18n()

  const [hexagrams, setHexagrams] = useState<HexagramListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadHexagrams()
  }, [loadHexagrams])

  async function loadHexagrams() {
    try {
      setLoading(true)
      const resp = await apiClient.api.yiching.hexagrams.$get()
      if (!resp.ok) throw new Error('fetch_failed')
      const json = await resp.json()
      setHexagrams((json.data ?? json) as unknown as HexagramListItem[])
    } catch {
      // API 不可用时回退到静态数据（无需 Worker 部署）
      setHexagrams(HEXAGRAM_LIST)
    } finally {
      setLoading(false)
    }
  }

  const filtered = search.trim()
    ? hexagrams.filter(
        (h) =>
          h.name.includes(search) ||
          h.pinyin.toLowerCase().includes(search.toLowerCase()) ||
          h.keywords.some((k) => k.includes(search))
      )
    : hexagrams

  const renderItem = useCallback(
    ({ item }: { item: HexagramListItem }) => {
      const fortune = fortuneColors[item.fortune]
      return (
        <Pressable
          onPress={() => router.push(`/hexagrams/${item.number}`)}
          style={({ pressed }) => ({
            backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
            borderRadius: 0,
            marginBottom: 10,
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
            {/* 卦象符号 */}
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 0,
                backgroundColor: `${colors.accent}15`,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 14,
              }}
            >
              <Text style={{ fontSize: 28 }}>{item.symbol}</Text>
            </View>

            {/* 名称 + 信息 */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>
                  {item.name}
                  {t('yiching_gua_suffix')}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>{item.pinyin}</Text>
                <View
                  style={{
                    backgroundColor: fortune.bg,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 0,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: fortune.text }}>
                    {FORTUNE_LABELS[item.fortune]}
                  </Text>
                </View>
              </View>

              {/* 关键词 */}
              {item.keywords.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {item.keywords.slice(0, 4).map((keyword, idx) => (
                    <Text key={idx} style={{ fontSize: 12, color: colors.textSecondary }}>
                      {keyword}
                      {idx < Math.min(item.keywords.length, 4) - 1 ? ' · ' : ''}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            {/* 卦号 */}
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 8 }}>
              #{item.number}
            </Text>
          </View>
        </Pressable>
      )
    },
    [colors, router, t]
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <BackButton />
        <Text
          style={{ fontSize: 20, fontWeight: '600', color: colors.text, marginLeft: 8, flex: 1 }}
        >
          {t('hexagrams_title')}
        </Text>
      </View>

      {/* 搜索框 */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: 0,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('hexagrams_search')}
            placeholderTextColor={colors.textSecondary}
            style={{
              flex: 1,
              marginLeft: 10,
              fontSize: 15,
              color: colors.text,
            }}
          />
        </View>
      </View>

      {/* 列表 */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size='large' color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.number)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Text style={{ fontSize: 16, color: colors.textSecondary }}>
                {search ? t('hexagrams_empty') : t('load_failed')}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
