import { getStatusColors, getTokens } from '@zhop/hexastral-tokens/palette'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import Purchases, { type PurchasesPackage } from 'react-native-purchases'

export interface SatellitePaywallProductIds {
  monthly: string
  annual: string
  [key: string]: string
}

export type SatellitePaywallPurchaseResult = 'success' | 'cancelled' | 'failed' | 'unavailable'

export interface SatellitePaywallCopy {
  title?: string
  restorePrimary?: string
  restoreSecondary?: string
  /** Human-readable plan labels keyed by `productIds` entry (e.g. monthly, annual). */
  planLabels?: Record<string, string>
  loading?: string
  purchaseFailed?: string
  restoreFailed?: string
  restoreSuccess?: string
  unavailable?: string
  /** Auto-renew / cancel path disclosure (Guideline 3.1.2). */
  autoRenewDisclaimer?: string
  privacyLabel?: string
  termsLabel?: string
}

export interface SatellitePaywallProps {
  productIds: SatellitePaywallProductIds
  /** When true, shows App Store / Play product id under each plan (debug). Default false. */
  showProductIds?: boolean
  /** Prefer package purchase from offerings; falls back to purchaseProduct(productId). */
  onSelect?: (productId: string) => void
  /**
   * Called after a successful restore. Default implementation restores via RC.
   * Return true when the expected entitlement is active.
   */
  onRestore?: () => void | Promise<void>
  /** Entitlement id to verify after purchase/restore (e.g. auspice_pro). */
  entitlementId?: string
  privacyUrl?: string
  termsUrl?: string
  onPurchaseComplete?: (result: SatellitePaywallPurchaseResult) => void
  onRestoreComplete?: (restored: boolean) => void
  copy?: SatellitePaywallCopy
}

function planDisplayName(key: string, labels: Record<string, string> | undefined): string {
  const fromCopy = labels?.[key]
  if (fromCopy) return fromCopy
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

function isUserCancelled(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { code?: string; userCancelled?: boolean }
  return e.userCancelled === true || e.code === 'PURCHASE_CANCELLED'
}

export function SatellitePaywall(props: SatellitePaywallProps) {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const colors = getTokens(isDark)
  const statusColors = getStatusColors(isDark)
  const showSku = props.showProductIds === true
  const entries = Object.entries(props.productIds)
  const [busy, setBusy] = useState<'load' | 'buy' | 'restore' | null>('load')
  const [status, setStatus] = useState<string | null>(null)
  const [statusKind, setStatusKind] = useState<'ok' | 'err' | null>(null)
  const [packagesByProductId, setPackagesByProductId] = useState<Record<string, PurchasesPackage>>(
    {}
  )
  const [priceByProductId, setPriceByProductId] = useState<Record<string, string>>({})

  const loadOfferings = useCallback(async () => {
    setBusy('load')
    setStatus(null)
    setStatusKind(null)
    try {
      const offerings = await Purchases.getOfferings()
      const current = offerings.current
      const nextPkgs: Record<string, PurchasesPackage> = {}
      const nextPrices: Record<string, string> = {}
      const productIds = new Set(Object.values(props.productIds))

      if (current) {
        for (const pkg of current.availablePackages) {
          const pid = pkg.product.identifier
          if (productIds.has(pid)) {
            nextPkgs[pid] = pkg
            nextPrices[pid] = pkg.product.priceString
          }
        }
        if (current.monthly && productIds.has(current.monthly.product.identifier)) {
          nextPkgs[current.monthly.product.identifier] = current.monthly
          nextPrices[current.monthly.product.identifier] = current.monthly.product.priceString
        }
        if (current.annual && productIds.has(current.annual.product.identifier)) {
          nextPkgs[current.annual.product.identifier] = current.annual
          nextPrices[current.annual.product.identifier] = current.annual.product.priceString
        }
      }

      // Fallback: fetch products directly when offering packages miss a SKU.
      const missing = [...productIds].filter((id) => !nextPrices[id])
      if (missing.length > 0) {
        try {
          const products = await Purchases.getProducts(missing)
          for (const product of products) {
            nextPrices[product.identifier] = product.priceString
          }
        } catch {
          // Prices stay empty — labels still render.
        }
      }

      setPackagesByProductId(nextPkgs)
      setPriceByProductId(nextPrices)
      if (Object.keys(nextPrices).length === 0) {
        setStatus(props.copy?.unavailable ?? 'Purchases unavailable')
        setStatusKind('err')
      }
    } catch (err) {
      console.warn('[satellite-ui] offerings failed', err)
      setStatus(props.copy?.unavailable ?? 'Purchases unavailable')
      setStatusKind('err')
    } finally {
      setBusy(null)
    }
  }, [props.copy?.unavailable, props.productIds])

  useEffect(() => {
    void loadOfferings()
  }, [loadOfferings])

  const entitlementActive = async (): Promise<boolean> => {
    if (!props.entitlementId) return true
    try {
      const info = await Purchases.getCustomerInfo()
      return Boolean(info.entitlements.active[props.entitlementId])
    } catch {
      return false
    }
  }

  const onSelectPlan = async (productId: string) => {
    if (props.onSelect) {
      props.onSelect(productId)
      return
    }
    setBusy('buy')
    setStatus(null)
    setStatusKind(null)
    try {
      const pkg = packagesByProductId[productId]
      if (pkg) {
        await Purchases.purchasePackage(pkg)
      } else {
        await Purchases.purchaseProduct(productId)
      }
      const ok = await entitlementActive()
      const result: SatellitePaywallPurchaseResult = ok ? 'success' : 'failed'
      if (!ok) {
        setStatus(props.copy?.purchaseFailed ?? 'Purchase failed')
        setStatusKind('err')
      }
      props.onPurchaseComplete?.(result)
    } catch (err) {
      if (isUserCancelled(err)) {
        props.onPurchaseComplete?.('cancelled')
      } else {
        console.warn('[satellite-ui] purchase failed', err)
        setStatus(props.copy?.purchaseFailed ?? 'Purchase failed')
        setStatusKind('err')
        props.onPurchaseComplete?.('failed')
      }
    } finally {
      setBusy(null)
    }
  }

  const onRestore = async () => {
    setBusy('restore')
    setStatus(null)
    setStatusKind(null)
    try {
      if (props.onRestore) {
        await props.onRestore()
        const ok = await entitlementActive()
        if (ok) {
          setStatus(props.copy?.restoreSuccess ?? 'Purchases restored')
          setStatusKind('ok')
        } else {
          setStatus(props.copy?.restoreFailed ?? 'No purchases to restore')
          setStatusKind('err')
        }
        props.onRestoreComplete?.(ok)
        return
      }
      await Purchases.restorePurchases()
      const ok = await entitlementActive()
      if (ok) {
        setStatus(props.copy?.restoreSuccess ?? 'Purchases restored')
        setStatusKind('ok')
      } else {
        setStatus(props.copy?.restoreFailed ?? 'No purchases to restore')
        setStatusKind('err')
      }
      props.onRestoreComplete?.(ok)
    } catch (err) {
      console.warn('[satellite-ui] restore failed', err)
      setStatus(props.copy?.restoreFailed ?? 'Restore failed')
      setStatusKind('err')
      props.onRestoreComplete?.(false)
    } finally {
      setBusy(null)
    }
  }

  const openUrl = (url: string) => {
    void Linking.openURL(url).catch((err) => {
      console.warn('[satellite-ui] openURL failed', err)
    })
  }

  if (busy === 'load') {
    return (
      <View style={[styles.wrap, styles.centered]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={[styles.planId, { color: colors.dim }]}>
          {props.copy?.loading ?? 'Loading…'}
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.text }]}>
        {props.copy?.title ?? 'Unlock Pro'}
      </Text>
      {entries.map(([key, value]) => {
        const price = priceByProductId[value]
        return (
          <Pressable
            key={key}
            style={[styles.plan, { borderColor: colors.separator, backgroundColor: colors.card }]}
            onPress={() => void onSelectPlan(value)}
            disabled={busy != null}
            accessibilityRole='button'
            accessibilityLabel={
              price
                ? `${planDisplayName(key, props.copy?.planLabels)}, ${price}`
                : planDisplayName(key, props.copy?.planLabels)
            }
          >
            <Text style={[styles.planTitle, { color: colors.text }]}>
              {planDisplayName(key, props.copy?.planLabels)}
            </Text>
            {price ? <Text style={[styles.price, { color: colors.text }]}>{price}</Text> : null}
            {showSku ? <Text style={[styles.planId, { color: colors.dim }]}>{value}</Text> : null}
          </Pressable>
        )
      })}
      <Pressable
        style={[styles.plan, { borderColor: colors.separator, backgroundColor: colors.card }]}
        onPress={() => void onRestore()}
        disabled={busy != null}
        accessibilityRole='button'
        accessibilityLabel={props.copy?.restorePrimary ?? 'Restore purchases'}
      >
        <Text style={[styles.planTitle, { color: colors.text }]}>
          {busy === 'restore'
            ? (props.copy?.loading ?? 'Loading…')
            : (props.copy?.restorePrimary ?? 'Restore purchases')}
        </Text>
        {props.copy?.restoreSecondary ? (
          <Text style={[styles.planId, { color: colors.dim }]}>{props.copy.restoreSecondary}</Text>
        ) : null}
      </Pressable>

      {status ? (
        <Text
          style={[
            styles.status,
            { color: statusKind === 'ok' ? colors.accent : statusColors.danger },
          ]}
        >
          {status}
        </Text>
      ) : null}

      {props.copy?.autoRenewDisclaimer ? (
        <Text style={[styles.disclaimer, { color: colors.dim }]}>
          {props.copy.autoRenewDisclaimer}
        </Text>
      ) : null}

      {props.privacyUrl || props.termsUrl ? (
        <View style={styles.legalRow}>
          {props.privacyUrl ? (
            <Pressable
              onPress={() => openUrl(props.privacyUrl!)}
              accessibilityRole='link'
              accessibilityLabel={props.copy?.privacyLabel ?? 'Privacy'}
            >
              <Text style={[styles.legalLink, { color: colors.accent }]}>
                {props.copy?.privacyLabel ?? 'Privacy'}
              </Text>
            </Pressable>
          ) : null}
          {props.privacyUrl && props.termsUrl ? (
            <Text style={{ color: colors.dim }}> · </Text>
          ) : null}
          {props.termsUrl ? (
            <Pressable
              onPress={() => openUrl(props.termsUrl!)}
              accessibilityRole='link'
              accessibilityLabel={props.copy?.termsLabel ?? 'Terms'}
            >
              <Text style={[styles.legalLink, { color: colors.accent }]}>
                {props.copy?.termsLabel ?? 'Terms'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 10 },
  centered: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  title: { fontSize: 18, fontWeight: '600' },
  plan: {
    borderWidth: 0.5,
    borderRadius: 0,
    padding: 12,
    gap: 4,
  },
  planTitle: { fontSize: 14, fontWeight: '500' },
  price: { fontSize: 15, fontWeight: '600' },
  planId: { fontSize: 12 },
  status: { fontSize: 12, lineHeight: 16 },
  disclaimer: { fontSize: 11, lineHeight: 15 },
  legalRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  legalLink: { fontSize: 12, fontWeight: '500' },
})
