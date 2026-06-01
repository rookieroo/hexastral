/**
 * SatelliteFlagshipUpsellCard — funnel CTA shown on satellite result pages.
 *
 * Reads `suggestedFlagship` from the portfolio response and renders a
 * flagship-branded card. Tap opens `deepLink` (e.g., `hexastral://onboard?...`);
 * if the flagship app isn't installed, falls back to its App Store URL.
 *
 * Brand copy + deep-link scheme are passed in by the host satellite — this
 * component is brand-agnostic so a future flagship (e.g., Bázì) drops in by
 * extending the `FlagshipKey` union and adding one prop entry.
 *
 * Phase G Week 3: the card now detects whether the flagship is installed
 * (`Linking.canOpenURL(deepLink)` on mount) and swaps to `installedCta` /
 * `installedBody` when present. Reduces semantic mismatch when an already-
 * installed user sees "Install HexAstral" copy.
 */

import { useTheme } from '@zhop/core-ui'
import type { ModeTokens } from '@zhop/hexastral-tokens/palette'
import type { FlagshipKey } from '@zhop/portfolio-client'
import * as Linking from 'expo-linking'
import { type ReactElement, useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

export interface SatelliteFlagshipUpsellLabels {
  kicker: string
  title: string
  body: string
  /** CTA shown when the flagship is NOT installed (or install state unknown). */
  cta: string
  /** Optional CTA shown when `Linking.canOpenURL(deepLink)` resolves true. */
  installedCta?: string
  /** Optional shorter body shown when the flagship is already installed. */
  installedBody?: string
}

export interface SatelliteFlagshipUpsellCardProps {
  suggestedFlagship: FlagshipKey | null
  /** Per-flagship label set. Provide entries for any flagship you want to render. */
  labelsByFlagship: Partial<Record<FlagshipKey, SatelliteFlagshipUpsellLabels>>
  /** Deep link to open (e.g. `hexastral://onboard?from=face-oracle&...`). */
  deepLink: string
  /** Fallback App Store URL when the flagship isn't installed. */
  appStoreUrl: string
  /** Optional analytics hook called when the user taps the CTA. */
  onUpgrade?: (flagship: FlagshipKey) => void
}

export function SatelliteFlagshipUpsellCard(
  props: SatelliteFlagshipUpsellCardProps
): ReactElement | null {
  const { suggestedFlagship, labelsByFlagship, deepLink, appStoreUrl, onUpgrade } = props
  // Consume the brand theme set by the host's `<CoreUIProvider>` instead of
  // reading the system color scheme directly. Hosts that force dark (e.g.
  // fate-app, hexastral-app) get their override honoured here too.
  const colors = useTheme().colors as ModeTokens
  const [installed, setInstalled] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const can = await Linking.canOpenURL(deepLink)
        if (!cancelled) setInstalled(can)
      } catch {
        // Non-allowlisted schemes throw on some platforms — treat as unknown.
        if (!cancelled) setInstalled(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [deepLink])

  if (!suggestedFlagship) return null
  const labels = labelsByFlagship[suggestedFlagship]
  if (!labels) return null

  const ctaText = installed && labels.installedCta ? labels.installedCta : labels.cta
  const bodyText = installed && labels.installedBody ? labels.installedBody : labels.body

  const handlePress = async () => {
    onUpgrade?.(suggestedFlagship)
    try {
      const canOpen = await Linking.canOpenURL(deepLink)
      if (canOpen) {
        await Linking.openURL(deepLink)
        return
      }
    } catch {
      // Some platforms throw on canOpenURL for non-allowlisted schemes; fall through.
    }
    void Linking.openURL(appStoreUrl)
  }

  return (
    <View style={[styles.card, { borderColor: colors.separator, backgroundColor: colors.card }]}>
      <Text style={[styles.kicker, { color: colors.secondary }]}>{labels.kicker}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{labels.title}</Text>
      <Text style={[styles.body, { color: colors.secondary }]}>{bodyText}</Text>
      <Pressable
        style={[styles.cta, { borderColor: colors.text, backgroundColor: colors.text }]}
        onPress={() => void handlePress()}
      >
        <Text style={[styles.ctaText, { color: colors.bg }]}>{ctaText}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 0.5,
    borderRadius: 0,
    padding: 16,
    gap: 10,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
  },
  cta: {
    marginTop: 6,
    borderWidth: 0.5,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
})
