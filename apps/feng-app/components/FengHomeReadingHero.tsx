/**
 * Home hero — same qualitative overview as report page 0 (`FengDigestCard`).
 */

import {
  deriveReportDigest,
  type FengComputeJson,
  type ReportDigest,
} from '@zhop/scenario-feng'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { FengDigestCard } from '@/components/FengDigestCard'
import type { Strings } from '@/lib/i18n'
import { FENG_PALETTE, spacing } from '@/lib/theme'

export interface FengHomeReadingHeroProps {
  siteName: string
  address?: string | null
  compute: FengComputeJson | null | undefined
  confidence?: ReportDigest['confidence']
  t: Strings
  loading?: boolean
  onPress: () => void
}

export function FengHomeReadingHero({
  siteName,
  address,
  compute,
  confidence,
  t,
  loading,
  onPress,
}: FengHomeReadingHeroProps) {
  const digest = deriveReportDigest(compute, confidence)

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={siteName}
      style={({ pressed }) => ({
        opacity: pressed ? 0.92 : 1,
        gap: spacing.md,
      })}
    >
      <View style={{ gap: spacing.xs, paddingHorizontal: spacing.xs }}>
        <Text
          style={{ color: FENG_PALETTE.copperGold, fontSize: 11, letterSpacing: 2 }}
        >
          {t.report_digest_tag.toUpperCase()}
        </Text>
        <Text
          style={{ color: FENG_PALETTE.rice, fontSize: 22, fontWeight: '700' }}
          numberOfLines={1}
        >
          {siteName}
        </Text>
        {address ? (
          <Text style={{ color: FENG_PALETTE.riceMute, fontSize: 13 }} numberOfLines={1}>
            {address}
          </Text>
        ) : null}
      </View>

      {loading && !digest ? (
        <View style={{ height: 160, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={FENG_PALETTE.copperGold} />
        </View>
      ) : digest ? (
        <FengDigestCard digest={digest} t={t} />
      ) : (
        <View style={{ height: 80, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: FENG_PALETTE.riceMute, fontSize: 13 }}>{t.empty_subtitle}</Text>
        </View>
      )}
    </Pressable>
  )
}
