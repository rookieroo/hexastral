/**
 * 卦象详情页 — 单个卦象知识
 *
 * 路由: /hexagrams/[number]
 */

import type { HexagramData } from '@zhop/hexastral-client'
import { FORTUNE_LABELS } from '@zhop/hexastral-tokens/constants/fortune'
import { HEXAGRAM_DETAILS } from '@zhop/hexastral-tokens/constants/hexagram'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BackButton } from '@/components/ui/BackButton'
import { apiClient } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { fortuneColors, theme } from '@/lib/theme'

export default function HexagramDetailScreen() {
  const { number } = useLocalSearchParams<{ number: string }>()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const colors = colorScheme === 'dark' ? theme.dark : theme.light
  const { t } = useI18n()

  const [hexagram, setHexagram] = useState<HexagramData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!number) return
    loadHexagram()
  }, [number, loadHexagram])

  async function loadHexagram() {
    try {
      setLoading(true)
      const resp = await apiClient.api.yiching.hexagrams[':number'].$get({
        param: { number: String(number) },
      })
      if (!resp.ok) throw new Error('fetch_failed')
      const json = await resp.json()
      setHexagram((json.data ?? json) as unknown as HexagramData)
    } catch {
      // API 不可用时回退到静态数据
      const fallback = HEXAGRAM_DETAILS.find((h) => h.number === Number(number))
      if (fallback) setHexagram(fallback)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size='large' color={colors.accent} />
      </SafeAreaView>
    )
  }

  if (!hexagram) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: colors.textSecondary }}>{t('hexagrams_not_found')}</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.accent }}>{t('back')}</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  const fortune = fortuneColors[hexagram.fortune]

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
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text, marginLeft: 8 }}>
          {t('yiching_ordinal', { n: hexagram.number })}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* 卦象符号 + 名称 */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <Text style={{ fontSize: 80 }}>{hexagram.symbol}</Text>
          <Text style={{ fontSize: 32, fontWeight: '600', color: colors.text, marginTop: 8 }}>
            {hexagram.name}
            {t('yiching_gua_suffix')}
          </Text>
          <Text style={{ fontSize: 16, color: colors.textSecondary, marginTop: 4 }}>
            {hexagram.pinyin} · {t('yiching_ordinal', { n: hexagram.number })}
          </Text>

          {/* 上下卦 */}
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8 }}>
            {t('hexagram_upper')} {hexagram.upperTrigram} · {t('hexagram_lower')}{' '}
            {hexagram.lowerTrigram}
          </Text>

          {/* 吉凶 */}
          <View
            style={{
              backgroundColor: fortune.bg,
              paddingHorizontal: 20,
              paddingVertical: 6,
              borderRadius: 0,
              marginTop: 12,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: fortune.text }}>
              {FORTUNE_LABELS[hexagram.fortune]}
            </Text>
          </View>
        </View>

        {/* 关键词 */}
        {hexagram.keywords.length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 20,
              justifyContent: 'center',
            }}
          >
            {hexagram.keywords.map((keyword, idx) => (
              <View
                key={idx}
                style={{
                  backgroundColor: `${colors.accent}15`,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 0,
                }}
              >
                <Text style={{ fontSize: 13, color: colors.accent }}>{keyword}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 卦辞 */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 0,
            padding: 20,
            marginBottom: 16,
            borderWidth: 0.5,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>
            {t('yiching_guaci')}
          </Text>
          <Text style={{ fontSize: 16, color: colors.text, fontStyle: 'italic', lineHeight: 26 }}>
            {hexagram.judgment}
          </Text>
        </View>

        {/* 象辞 */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 0,
            padding: 20,
            marginBottom: 16,
            borderWidth: 0.5,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>
            {t('yiching_xiangci')}
          </Text>
          <Text style={{ fontSize: 16, color: colors.text, fontStyle: 'italic', lineHeight: 26 }}>
            {hexagram.image}
          </Text>
        </View>

        {/* 卦辞解释 */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 0,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>
            {t('hexagram_guaci_detail')}
          </Text>
          <Text style={{ fontSize: 15, color: colors.text, lineHeight: 24 }}>
            {hexagram.judgmentExplain}
          </Text>
        </View>

        {/* 六爻 */}
        {hexagram.lines.length > 0 && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 0,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
              {t('hexagram_yaoci')}
            </Text>
            {hexagram.lines.map((line, idx) => (
              <View key={idx} style={{ marginBottom: idx < hexagram.lines.length - 1 ? 12 : 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <View
                    style={{
                      backgroundColor: `${colors.accent}20`,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 0,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '600' }}>
                      {t('yiching_yao_ordinal', { n: idx + 1 })}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22, marginLeft: 4 }}>
                  {line}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
