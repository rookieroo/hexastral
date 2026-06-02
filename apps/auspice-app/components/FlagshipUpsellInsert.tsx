/**
 * Flagship funnel card (ADR-0010 §4) — intent-routed: wedding → Kindred; office /
 * move-in / groundbreaking → Fēng. Deep-links into the flagship with an App Store
 * fallback for unverified installs.
 *
 * Self-contained (deep link + fallback) for v1; can later be swapped for
 * `SatelliteFlagshipUpsellCard` from `@zhop/satellite-ui`. TODO: wire
 * `emitCrossAppDiscoveryTap` for `cross_app_discovery_tap` telemetry.
 */

import { Button, useTheme } from '@zhop/core-ui'
import { Linking, Text, View } from 'react-native'
import { FLAGSHIP_LINKS } from '@/lib/config'
import type { Locale } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'

type Flagship = 'yuan' | 'feng'
interface Copy {
  title: string
  body: string
  cta: string
}

const COPY: Record<Flagship, Record<Locale, Copy>> = {
  yuan: {
    'zh-Hans': {
      title: '为这桩喜事合个八字？',
      body: 'Kindred Kindred · 双人合婚与关系分析',
      cta: '打开 Kindred',
    },
    'zh-Hant': {
      title: '為這樁喜事合個八字？',
      body: 'Kindred Kindred · 雙人合婚與關係分析',
      cta: '開啟 Kindred',
    },
    ja: {
      title: 'この慶事、相性も占う？',
      body: 'Kindred 縁 · 相性と関係の鑑定',
      cta: 'Kindred を開く',
    },
    en: {
      title: 'Pair two charts for the big day?',
      body: 'Kindred · compatibility & relationships',
      cta: 'Open Kindred',
    },
  },
  feng: {
    'zh-Hans': { title: '挑个好方位再动工？', body: 'Fēng 风 · 风水择址与布局', cta: '打开 Fēng' },
    'zh-Hant': { title: '挑個好方位再動工？', body: 'Fēng 風 · 風水擇址與佈局', cta: '開啟 Fēng' },
    ja: { title: '良い方位を選んでから？', body: 'Fēng 風 · 風水の立地と配置', cta: 'Fēng を開く' },
    en: {
      title: 'Pick an auspicious site first?',
      body: 'Fēng · feng-shui siting & layout',
      cta: 'Open Fēng',
    },
  },
}

export function FlagshipUpsellInsert({ flagship }: { flagship: Flagship }) {
  const { colors, spacing } = useTheme()
  const { locale } = useStrings()
  const copy = COPY[flagship][locale]
  const link = FLAGSHIP_LINKS[flagship]

  const open = () => {
    Linking.openURL(link.deepLink).catch(() => {
      Linking.openURL(link.appStoreUrl).catch(() => {})
    })
  }

  return (
    <View
      style={{
        borderRadius: 16,
        backgroundColor: colors.accentGhost,
        borderWidth: 0.5,
        borderColor: colors.accent,
        padding: spacing.lg,
        gap: spacing.sm,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{copy.title}</Text>
      <Text style={{ color: colors.secondary, fontSize: 13 }}>{copy.body}</Text>
      <View style={{ marginTop: spacing.sm }}>
        <Button variant='secondary' onPress={open}>
          {copy.cta}
        </Button>
      </View>
    </View>
  )
}
