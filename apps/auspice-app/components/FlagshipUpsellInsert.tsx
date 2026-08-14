/**
 * Flagship funnel card (ADR-0010 §4) — intent-routed: wedding → Yuel; office /
 * move-in / groundbreaking → Kanyu. Deep-links into the flagship with an App Store
 * fallback for unverified installs.
 *
 * When the flagship has not shipped yet (`FLAGSHIP_LIVE[key] === false`) the card
 * renders a "coming soon" state linking to that app's live brand LP instead of
 * returning null — the Discover section always has honest content and never a
 * placeholder 404. Flip `FLAGSHIP_LIVE[key]` when that app goes live to switch the
 * card to the deep-link funnel.
 *
 * TODO: wire `emitCrossAppDiscoveryTap` for `cross_app_discovery_tap` telemetry.
 */

import { Button, useTheme } from '@zhop/core-ui'
import { Linking, Text, View } from 'react-native'
import { FLAGSHIP_LINKS, FLAGSHIP_LIVE } from '@/lib/config'
import type { Locale } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'

type Flagship = 'yuan' | 'feng'
interface Copy {
  title: string
  body: string
  cta: string
  comingSoonTitle: string
  comingSoonCta: string
}

const COPY: Record<Flagship, Record<Locale, Copy>> = {
  yuan: {
    'zh-Hans': {
      title: '为这桩喜事合个八字？',
      body: 'Yuel · 双人合婚与关系分析',
      cta: '打开 Yuel',
      comingSoonTitle: '双人合婚与关系解读 · 即将推出',
      comingSoonCta: '了解 Yuel',
    },
    'zh-Hant': {
      title: '為這樁喜事合個八字？',
      body: 'Yuel · 雙人合婚與關係分析',
      cta: '開啟 Yuel',
      comingSoonTitle: '雙人合婚與關係解讀 · 即將推出',
      comingSoonCta: '了解 Yuel',
    },
    ja: {
      title: 'この慶事、相性も占う？',
      body: 'Yuel 縁 · 相性と関係の鑑定',
      cta: 'Yuel を開く',
      comingSoonTitle: '相性と関係の鑑定 · まもなく登場',
      comingSoonCta: 'Yuel について',
    },
    en: {
      title: 'Pair two charts for the big day?',
      body: 'Yuel · compatibility & relationships',
      cta: 'Open Yuel',
      comingSoonTitle: 'Compatibility & relationship readings · coming soon',
      comingSoonCta: 'Learn about Yuel',
    },
  },
  feng: {
    'zh-Hans': {
      title: '挑个好方位再动工？',
      body: 'Kanyu · 风水择址与布局',
      cta: '打开 Kanyu',
      comingSoonTitle: '风水择址与布局 · 即将推出',
      comingSoonCta: '了解 Kanyu',
    },
    'zh-Hant': {
      title: '挑個好方位再動工？',
      body: 'Kanyu · 風水擇址與佈局',
      cta: '開啟 Kanyu',
      comingSoonTitle: '風水擇址與佈局 · 即將推出',
      comingSoonCta: '了解 Kanyu',
    },
    ja: {
      title: '良い方位を選んでから？',
      body: 'Kanyu 風 · 風水の立地と配置',
      cta: 'Kanyu を開く',
      comingSoonTitle: '風水の立地と配置 · まもなく登場',
      comingSoonCta: 'Kanyu について',
    },
    en: {
      title: 'Pick an auspicious site first?',
      body: 'Kanyu · feng-shui siting & layout',
      cta: 'Open Kanyu',
      comingSoonTitle: 'Feng-shui siting & layout · coming soon',
      comingSoonCta: 'Learn about Kanyu',
    },
  },
}

export function FlagshipUpsellInsert({ flagship }: { flagship: Flagship }) {
  const { colors, spacing } = useTheme()
  const { locale } = useStrings()
  const copy = COPY[flagship][locale]
  const link = FLAGSHIP_LINKS[flagship]
  const live = FLAGSHIP_LIVE[flagship]

  // Live: funnel via deep link with a store fallback (appStoreUrl is filled by
  // then). Pre-launch: the brand LP — a real page, never a placeholder 404.
  const open = () => {
    if (live) {
      Linking.openURL(link.deepLink).catch(() => {
        Linking.openURL(link.appStoreUrl).catch(() => {})
      })
    } else {
      Linking.openURL(link.landingUrl).catch(() => {})
    }
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
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
        {live ? copy.title : copy.comingSoonTitle}
      </Text>
      <Text style={{ color: colors.secondary, fontSize: 13 }}>{copy.body}</Text>
      <View style={{ marginTop: spacing.sm }}>
        <Button variant='secondary' onPress={open}>
          {live ? copy.cta : copy.comingSoonCta}
        </Button>
      </View>
    </View>
  )
}
