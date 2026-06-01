import { getTokens } from '@zhop/hexastral-tokens/palette'
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native'
import Purchases from 'react-native-purchases'

export interface SatellitePaywallProductIds {
  monthly: string
  annual: string
  [key: string]: string
}

export interface SatellitePaywallProps {
  productIds: SatellitePaywallProductIds
  /** When true, shows App Store / Play product id under each plan (debug). Default false. */
  showProductIds?: boolean
  onSelect?: (productId: string) => void
  onRestore?: () => void
  copy?: {
    title?: string
    restorePrimary?: string
    restoreSecondary?: string
    /** Human-readable plan labels keyed by `productIds` entry (e.g. monthly, annual). */
    planLabels?: Record<string, string>
  }
}

function planDisplayName(key: string, labels: Record<string, string> | undefined): string {
  const fromCopy = labels?.[key]
  if (fromCopy) return fromCopy
  // readable fallback for camelCase keys (e.g. castPack)
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

export function SatellitePaywall(props: SatellitePaywallProps) {
  const colors = getTokens(useColorScheme() === 'dark')
  const showSku = props.showProductIds === true
  const entries = Object.entries(props.productIds)
  const onSelectPlan = async (productId: string) => {
    if (props.onSelect) {
      props.onSelect(productId)
      return
    }
    try {
      await Purchases.purchaseProduct(productId)
    } catch (err) {
      console.warn('[satellite-ui] purchase failed', err)
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.text }]}>
        {props.copy?.title ?? 'Unlock Pro'}
      </Text>
      {entries.map(([key, value]) => (
        <Pressable
          key={key}
          style={[styles.plan, { borderColor: colors.separator, backgroundColor: colors.card }]}
          onPress={() => void onSelectPlan(value)}
          accessibilityRole='button'
        >
          <Text style={[styles.planTitle, { color: colors.text }]}>
            {planDisplayName(key, props.copy?.planLabels)}
          </Text>
          {showSku ? <Text style={[styles.planId, { color: colors.dim }]}>{value}</Text> : null}
        </Pressable>
      ))}
      <Pressable
        style={[styles.plan, { borderColor: colors.separator, backgroundColor: colors.card }]}
        onPress={() => props.onRestore?.()}
        accessibilityRole='button'
      >
        <Text style={[styles.planTitle, { color: colors.text }]}>
          {props.copy?.restorePrimary ?? 'restore'}
        </Text>
        {props.copy?.restoreSecondary ? (
          <Text style={[styles.planId, { color: colors.dim }]}>{props.copy.restoreSecondary}</Text>
        ) : (
          <Text style={[styles.planId, { color: colors.dim }]}>Restore purchases</Text>
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 10 },
  title: { fontSize: 18, fontWeight: '600' },
  plan: {
    borderWidth: 0.5,
    borderRadius: 0,
    padding: 12,
    gap: 4,
  },
  planTitle: { fontSize: 14, fontWeight: '500' },
  planId: { fontSize: 12 },
})
