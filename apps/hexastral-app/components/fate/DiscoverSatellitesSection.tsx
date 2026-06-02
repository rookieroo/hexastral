/**
 * DiscoverSatellitesSection — companion-app discovery rail (Phase J · J.3.4).
 *
 * Funnel direction: hexastral.fate (top-of-funnel, cheap-to-acquire personal-fate
 * audience) → deeper paid flagships (yuan / feng) + relevant satellites
 * (faceoracle). Flagships do NOT promote outward (per Z-constellation
 * principle, ADR-0009 amendment): yuan + feng are receivers.
 *
 * Cards listed by logical strength of the natal → target connection:
 *   yuan       — natal user wants partner's chart (synastry)
 *   faceoracle — natal user adds physical-features layer (face/palm)
 *   feng       — natal user wants 八宅 directions tied to their ming-gua
 *
 * Dream / hexagram / numerology are weaker natal connectives — they live in
 * their own ASO funnels and do not get hub-promotion here.
 *
 * App Store IDs are placeholders — replace after each satellite is submitted.
 */

import { DiscoveryCard, useTheme } from '@zhop/core-ui'
import { Eye, Home, Sparkles } from 'lucide-react-native'
import { useMemo } from 'react'
import { Text, View } from 'react-native'
import { emitFunnelEvent } from '@/lib/analytics'
import { useI18n } from '@/lib/i18n'
import type { TranslationKeys } from '@/locales/zh'

const VIA = 'hexastral'

type SatelliteKey = 'yuan' | 'faceoracle' | 'feng'

const APPSTORE_PLACEHOLDER: Record<SatelliteKey, string> = {
  yuan: 'id0000000010',
  faceoracle: 'id0000000011',
  feng: 'id0000000015',
}

interface SatelliteEntry {
  key: SatelliteKey
  titleKey: TranslationKeys
  subtitleKey: TranslationKeys
  icon: typeof Sparkles
}

const ENTRIES: ReadonlyArray<SatelliteEntry> = [
  {
    key: 'kindred',
    titleKey: 'discover_kindred_title',
    subtitleKey: 'discover_kindred_subtitle',
    icon: Sparkles,
  },
  {
    key: 'faceoracle',
    titleKey: 'discover_faceoracle_title',
    subtitleKey: 'discover_faceoracle_subtitle',
    icon: Eye,
  },
  {
    key: 'feng',
    titleKey: 'discover_feng_title',
    subtitleKey: 'discover_feng_subtitle',
    icon: Home,
  },
]

function buildTargetScheme(key: SatelliteKey): string {
  return `${key}://onboard?from=${VIA}`
}

function buildAppStoreUrl(key: SatelliteKey): string {
  return `https://apps.apple.com/app/${APPSTORE_PLACEHOLDER[key]}?via=${VIA}`
}

export function DiscoverSatellitesSection() {
  const { t } = useI18n()
  const { colors } = useTheme()

  const palette = useMemo(
    () => ({
      background: colors.card,
      text: colors.text,
      textSecondary: colors.secondary,
      border: colors.separator,
      accent: colors.accent,
    }),
    [colors]
  )

  return (
    <View style={{ marginTop: 32, paddingHorizontal: 24, gap: 8 }}>
      <Text
        style={{
          color: colors.secondary,
          fontSize: 11,
          fontWeight: '300',
          letterSpacing: 1.8,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {t('discover_section_label')}
      </Text>
      {ENTRIES.map((entry) => {
        const Icon = entry.icon
        return (
          <DiscoveryCard
            key={entry.key}
            icon={<Icon size={20} color={colors.accent} strokeWidth={1.5} />}
            title={t(entry.titleKey)}
            subtitle={t(entry.subtitleKey)}
            targetScheme={buildTargetScheme(entry.key)}
            targetUrl={buildAppStoreUrl(entry.key)}
            brand={palette}
            onAttribution={(event) => {
              const action =
                event === 'open'
                  ? 'open_native'
                  : event === 'install_redirect'
                    ? 'fallback_app_store'
                    : 'tap'
              emitFunnelEvent({
                event_name: 'cross_app_discovery_tap',
                surface: 'fate_home',
                target_app: entry.key,
                payload: {
                  source_app: VIA,
                  target_app: entry.key,
                  action,
                  via: VIA,
                },
              })
            }}
          />
        )
      })}
    </View>
  )
}
