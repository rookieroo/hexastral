/**
 * 紫微命盘 — full 12-palace ziwei chart, pushed from the Me tab.
 *
 * A focused deep-dive: the Me tab shows a collapsed 命盘速览 glance (八字 +
 * key palaces); this screen is the complete 紫微 chart on demand, so neither
 * surface has to carry all the data at once.
 */

import { AutoMoonPhaseLoader, SKIN_SILVER } from '@zhop/core-ui/motion'
import { BackArrowIcon } from '@zhop/hexastral-icons/action'
import { Redirect, useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ZiweiChartView } from '@/components/ZiweiChartView'
import { useI18n } from '@/lib/i18n'
import { useAppTheme } from '@/lib/theme'
import { useBirthDraft } from '@/lib/use-birth-draft'
import { computeZiweiChart } from '@/lib/ziwei'

export default function ChartScreen() {
  const router = useRouter()
  const { colors } = useAppTheme()
  const { t } = useI18n()
  const state = useBirthDraft()

  const chart = useMemo(() => {
    if (state.status !== 'ready') return null
    try {
      return computeZiweiChart({
        solarDate: state.draft.solarDate,
        timeIndex: state.draft.timeIndex ?? 0,
        gender: state.draft.gender,
      })
    } catch { return null }
  }, [state])

  if (state.status === 'loading') {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.bg }]}>
        {/* 紫微 = 星 = 银调 loader */}
        <AutoMoonPhaseLoader size={88} skin={SKIN_SILVER} />
      </View>
    )
  }

  // Defensive: onboarding gate normally prevents this.
  if (state.status === 'empty' || !chart) {
    return <Redirect href='/birth?mode=onboarding' />
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <BackArrowIcon size={20} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.secondary }]}>{t('chart.title')}</Text>
          <View style={styles.spacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ZiweiChartView chart={chart} colors={colors} />
          {state.draft.timeIndex == null ? (
            <Text style={[styles.caveat, { color: colors.dim }]}>{t('chart.timeUnknownCaveat')}</Text>
          ) : null}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { fontSize: 11, letterSpacing: 4, fontWeight: '300' },
  spacer: { width: 20 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  caveat: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 16 },
})
