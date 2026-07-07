import { useTheme } from '@zhop/core-ui'
import type { PortfolioReadingItem } from '@zhop/portfolio-client'
import { SatelliteHistoryList } from '@zhop/satellite-ui'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { useSatelliteI18n } from '@/lib/i18n'

function parseResultMode(resultJson: string): 'classical' | 'ai' {
  try {
    const parsed: unknown = JSON.parse(resultJson)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const mode = (parsed as { interpretationMode?: unknown }).interpretationMode
      if (mode === 'classical') return 'classical'
    }
  } catch {
    /* legacy readings default to ai */
  }
  return 'ai'
}

function hexagramLabel(resultJson: string): string {
  try {
    const parsed: unknown = JSON.parse(resultJson)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const hex = (parsed as { hexagram?: { number?: number; name?: string } }).hexagram
      if (hex && typeof hex.number === 'number') {
        const name = typeof hex.name === 'string' ? hex.name : ''
        return `#${hex.number} ${name}`.trim()
      }
    }
  } catch {
    /* ignore */
  }
  return ''
}

export default function CoinCastHistoryScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { colors, spacing } = useTheme()
  const { t } = useSatelliteI18n()

  const renderItem = (item: PortfolioReadingItem) => {
    const mode = parseResultMode(item.resultJson)
    const hexLabel = hexagramLabel(item.resultJson)
    const tierLabel = mode === 'classical' ? t('historyTierClassical') : t('historyTierAi')
    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/detail',
            params: { readingId: item.id, payload: encodeURIComponent(item.resultJson) },
          })
        }
        style={[styles.row, { borderColor: colors.separator, backgroundColor: colors.card }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.primary, { color: colors.text }]}>
            {hexLabel || item.readingType}
          </Text>
          <Text
            style={[
              styles.badge,
              {
                color: mode === 'classical' ? colors.secondary : colors.accent,
                borderColor: colors.separator,
              },
            ]}
          >
            {tierLabel}
          </Text>
        </View>
        <Text style={[styles.secondary, { color: colors.secondary }]}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </Pressable>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style='auto' />
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole='button'
          accessibilityLabel={t('navBack')}
          hitSlop={12}
        >
          <Text style={{ color: colors.accent, fontSize: 24 }}>‹</Text>
        </Pressable>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>
          {t('stackHistory')}
        </Text>
      </View>
      <SatelliteHistoryList
        target={PORTFOLIO_TARGET_APP}
        emptyText={t('meEmpty')}
        renderItem={renderItem}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: {
    borderWidth: 0.5,
    borderRadius: 0,
    padding: 12,
    gap: 6,
  },
  primary: {
    fontWeight: '600',
    letterSpacing: 0.5,
    fontSize: 14,
  },
  secondary: {
    fontSize: 12,
  },
  badge: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    borderWidth: 0.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
})
