/**
 * DiscoveryCard — companion-app deep-link tile (Phase J · J.1.4).
 *
 * Used on hexastral-app's Fate home (J.3.4) to surface each satellite as a
 * tap-to-open card. On tap:
 *   1. Fires `onAttribution('tap')`.
 *   2. `Linking.canOpenURL(targetScheme)`:
 *        ✓ installed → openURL(targetScheme); fires `onAttribution('open')`.
 *        ✗ not installed → openURL(targetUrl); fires `onAttribution('install_redirect')`.
 *
 * `targetUrl` should already encode `?via=hexastral` (or similar) so the
 * satellite's first-launch growth-funnel hook picks up attribution and
 * applies the ADR-0004 §3 discount. This component doesn't append params;
 * the caller is responsible for assembling the URL.
 *
 * The component is also useful for satellite-to-satellite cross-promotion
 * later; brand palette is per-caller via the `brand` prop, default from
 * useTheme().
 */

import { type ReactNode, useCallback, useMemo } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme'

export type DiscoveryAttributionEvent = 'tap' | 'open' | 'install_redirect'

export interface DiscoveryCardPalette {
  background: string
  text: string
  textSecondary: string
  border: string
  accent: string
}

export interface DiscoveryCardProps {
  icon?: ReactNode
  title: string
  subtitle?: string
  /** Companion-app deep link, e.g. "yuel://onboard?from=hexastral". */
  targetScheme: string
  /** App Store fallback URL when the companion isn't installed. Should
   *  already include `?via=hexastral` for funnel attribution. */
  targetUrl: string
  brand?: DiscoveryCardPalette
  onAttribution?: (event: DiscoveryAttributionEvent) => void
  /** Optional trailing chevron / glyph; defaults to "→". Pass `null` to hide. */
  trailing?: ReactNode
  /** Optional onPress override. When set, replaces the default open behavior
   *  — caller takes responsibility for navigation + attribution. */
  onPressOverride?: () => void
}

export function DiscoveryCard({
  icon,
  title,
  subtitle,
  targetScheme,
  targetUrl,
  brand,
  onAttribution,
  trailing,
  onPressOverride,
}: DiscoveryCardProps) {
  const theme = useTheme()
  const palette: DiscoveryCardPalette = useMemo(
    () =>
      brand ?? {
        background: theme.colors.card,
        text: theme.colors.text,
        textSecondary: theme.colors.secondary,
        border: theme.colors.separator,
        accent: theme.colors.accent,
      },
    [brand, theme]
  )

  const styles = useMemo(() => createStyles(palette), [palette])

  const handlePress = useCallback(async () => {
    if (onPressOverride) {
      onPressOverride()
      return
    }
    onAttribution?.('tap')
    try {
      const canOpen = await Linking.canOpenURL(targetScheme)
      if (canOpen) {
        await Linking.openURL(targetScheme)
        onAttribution?.('open')
        return
      }
    } catch (err) {
      console.warn('[DiscoveryCard] canOpenURL failed', err)
    }
    try {
      await Linking.openURL(targetUrl)
      onAttribution?.('install_redirect')
    } catch (err) {
      console.warn('[DiscoveryCard] App Store fallback failed', err)
    }
  }, [onAttribution, onPressOverride, targetScheme, targetUrl])

  return (
    <Pressable onPress={handlePress} accessibilityRole='button' style={styles.card}>
      {icon ? <View style={styles.iconSlot}>{icon}</View> : null}
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing === null ? null : (
        <View style={styles.trailingSlot}>{trailing ?? <Text style={styles.chevron}>→</Text>}</View>
      )}
    </Pressable>
  )
}

function createStyles(p: DiscoveryCardPalette) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: p.background,
      borderWidth: 0.5,
      borderColor: p.border,
    },
    iconSlot: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1, gap: 2 },
    title: { fontSize: 15, fontWeight: '500', color: p.text },
    subtitle: { fontSize: 12, lineHeight: 18, color: p.textSecondary },
    trailingSlot: { paddingLeft: 8 },
    chevron: { fontSize: 16, color: p.accent },
  })
}
