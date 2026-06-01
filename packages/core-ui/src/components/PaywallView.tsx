/**
 * PaywallView — shared paywall content (Phase J · J.1.3).
 *
 * Renders the standard paywall shape (hero · title · subtitle · bullets ·
 * plan picker · CTA · restore · close · error) with a full purchase state
 * machine. Caller wires IAP/RevenueCat callbacks + supplies localized copy.
 *
 * Modal-vs-screen is the caller's choice: drop the view into a route screen
 * or wrap in <RN.Modal> — the component is presentation only.
 *
 * Plan picker:
 *   - productIds can include any of `monthly` | `annual` | `single`.
 *   - prices are caller-resolved strings (typically from RevenueCat offerings).
 *   - defaultPlan picks the highlighted card; falls back to 'annual' or the
 *     first key present.
 *
 * Why not in satellite-ui: satellite-ui's existing <SatellitePaywall> is a
 * thinner shim for the 4 satellites and stays as-is. PaywallView is richer
 * (bullets, multi-tier, full state machine) and is the target for flagship
 * adoption (yuan-app first; hexastral-app intentionally bespoke during J.3).
 */

import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme'

export type PaywallPlan = 'monthly' | 'annual' | 'single'

export type PurchaseOutcome = 'success' | 'cancelled' | 'failed' | 'unavailable'

export interface PaywallCopy {
  /** Headline at the top. */
  title: string
  /** Default subtitle if no `reason` is passed. */
  subtitle?: string
  planLabels: Partial<Record<PaywallPlan, string>>
  /** Optional small badge text per plan (e.g., "BEST VALUE"). */
  planBadges?: Partial<Record<PaywallPlan, string>>
  cta: string
  ctaPurchasing: string
  successLabel: string
  restoreLabel: string
  restoreLoadingLabel: string
  closeLabel?: string
  errorFailed: string
  errorUnavailable: string
}

export interface PaywallPalette {
  background: string
  text: string
  textSecondary: string
  textMuted: string
  border: string
  card: string
  accent: string
}

export interface PaywallViewProps {
  /** Contextual reason rendered as subtitle. Overrides copy.subtitle. */
  reason?: string
  productIds: Partial<Record<PaywallPlan, string>>
  prices?: Partial<Record<PaywallPlan, string | null>>
  /** 3-ish value props rendered as bullets above the plan picker. */
  bullets: string[]
  copy: PaywallCopy
  /** Color overrides. Defaults from useTheme(). */
  brand?: PaywallPalette
  /** Highlighted plan on mount. Defaults to first of: annual → monthly → single. */
  defaultPlan?: PaywallPlan
  onPurchase: (productId: string) => Promise<PurchaseOutcome>
  onRestore: () => Promise<boolean>
  /** Optional close handler. Renders close affordance when provided. */
  onClose?: () => void
  /** Optional hero / brand mark slot above the title. */
  hero?: ReactNode
}

type Status = 'idle' | 'purchasing' | 'restoring' | 'success' | 'error'

export function PaywallView({
  reason,
  productIds,
  prices,
  bullets,
  copy,
  brand,
  defaultPlan,
  onPurchase,
  onRestore,
  onClose,
  hero,
}: PaywallViewProps) {
  const theme = useTheme()
  const palette: PaywallPalette = useMemo(
    () =>
      brand ?? {
        background: theme.colors.bg,
        text: theme.colors.text,
        textSecondary: theme.colors.secondary,
        textMuted: theme.colors.dim,
        border: theme.colors.separator,
        card: theme.colors.card,
        accent: theme.colors.accent,
      },
    [brand, theme]
  )

  const availablePlans = useMemo(
    () =>
      (['annual', 'monthly', 'single'] as const).filter(
        (plan) => typeof productIds[plan] === 'string'
      ),
    [productIds]
  )

  const initialPlan: PaywallPlan =
    defaultPlan && availablePlans.includes(defaultPlan)
      ? defaultPlan
      : (availablePlans[0] ?? 'annual')

  const [plan, setPlan] = useState<PaywallPlan>(initialPlan)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Auto-dismiss after success.
  useEffect(() => {
    if (status !== 'success') return
    if (!onClose) return
    const t = setTimeout(onClose, 1200)
    return () => clearTimeout(t)
  }, [status, onClose])

  const subtitle = reason ?? copy.subtitle

  const handlePurchase = async () => {
    const productId = productIds[plan]
    if (!productId) return
    setStatus('purchasing')
    setErrorMsg(null)
    const outcome = await onPurchase(productId)
    if (outcome === 'success') {
      setStatus('success')
      return
    }
    if (outcome === 'cancelled') {
      setStatus('idle')
      return
    }
    setStatus('error')
    setErrorMsg(outcome === 'unavailable' ? copy.errorUnavailable : copy.errorFailed)
  }

  const handleRestore = async () => {
    setStatus('restoring')
    setErrorMsg(null)
    const restored = await onRestore()
    if (restored) {
      setStatus('success')
      return
    }
    setStatus('idle')
  }

  const styles = useMemo(() => createStyles(palette), [palette])
  const busy = status === 'purchasing' || status === 'restoring'

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollInner}
      showsVerticalScrollIndicator={false}
    >
      {onClose ? (
        <View style={styles.closeRow}>
          <Pressable onPress={onClose} hitSlop={12} disabled={busy}>
            <Text style={styles.closeText}>{copy.closeLabel ?? '×'}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.hero}>
        {hero ? <View style={styles.heroSlot}>{hero}</View> : null}
        <Text style={styles.title}>{copy.title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.bullets}>
        {bullets.map((b) => (
          <View key={b} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>·</Text>
            <Text style={styles.bulletText}>{b}</Text>
          </View>
        ))}
      </View>

      <View style={styles.plans}>
        {availablePlans.map((p) => (
          <PlanCard
            key={p}
            label={copy.planLabels[p] ?? p}
            price={prices?.[p] ?? '—'}
            badge={copy.planBadges?.[p]}
            selected={plan === p}
            onPress={() => setPlan(p)}
            palette={palette}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={handlePurchase}
          disabled={busy || status === 'success' || !productIds[plan]}
          hitSlop={12}
          style={[styles.cta, busy ? styles.ctaBusy : null]}
        >
          {status === 'purchasing' ? (
            <ActivityIndicator color={palette.accent} />
          ) : (
            <Text style={styles.ctaText}>
              {status === 'success' ? copy.successLabel : copy.cta}
            </Text>
          )}
        </Pressable>

        {status !== 'success' ? (
          <Pressable onPress={handleRestore} hitSlop={12} disabled={busy}>
            <Text style={styles.restore}>
              {status === 'restoring' ? copy.restoreLoadingLabel : copy.restoreLabel}
            </Text>
          </Pressable>
        ) : null}

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
      </View>
    </ScrollView>
  )
}

interface PlanCardProps {
  label: string
  price: string
  badge?: string
  selected: boolean
  onPress: () => void
  palette: PaywallPalette
}

function PlanCard({ label, price, badge, selected, onPress, palette }: PlanCardProps) {
  const styles = useMemo(() => createPlanStyles(palette, selected), [palette, selected])
  return (
    <Pressable onPress={onPress} hitSlop={4} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.label}>{label}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        </View>
        <Text style={styles.price}>{price}</Text>
      </View>
    </Pressable>
  )
}

function createStyles(p: PaywallPalette) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: p.background },
    scrollInner: { paddingHorizontal: 24, paddingBottom: 40, gap: 20 },
    closeRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8 },
    closeText: { fontSize: 18, color: p.textMuted },
    hero: { alignItems: 'center', paddingTop: 12, gap: 12 },
    heroSlot: { marginBottom: 4 },
    title: {
      fontSize: 22,
      fontWeight: '600',
      color: p.text,
      textAlign: 'center',
      letterSpacing: 0.3,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: p.textSecondary,
      textAlign: 'center',
    },
    bullets: { gap: 8, marginTop: 4 },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    bulletDot: { fontSize: 14, color: p.accent, lineHeight: 20 },
    bulletText: { flex: 1, fontSize: 14, lineHeight: 20, color: p.text },
    plans: { gap: 10, marginTop: 4 },
    actions: { marginTop: 8, alignItems: 'center', gap: 14 },
    cta: {
      width: '100%',
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: p.accent,
    },
    ctaBusy: { opacity: 0.5 },
    ctaText: {
      fontSize: 15,
      fontWeight: '600',
      color: p.background,
      letterSpacing: 0.2,
    },
    restore: {
      fontSize: 13,
      color: p.textMuted,
      textDecorationLine: 'underline',
    },
    errorText: {
      fontSize: 13,
      color: '#EF4444',
      textAlign: 'center',
      lineHeight: 18,
    },
  })
}

function createPlanStyles(p: PaywallPalette, selected: boolean) {
  return StyleSheet.create({
    card: {
      borderWidth: selected ? 1 : 0.5,
      borderColor: selected ? p.accent : p.border,
      backgroundColor: selected ? `${p.accent}0F` : p.card,
      padding: 14,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    left: { flex: 1, gap: 4 },
    label: { fontSize: 15, fontWeight: '500', color: p.text },
    badge: { fontSize: 11, color: p.accent, letterSpacing: 0.5 },
    price: { fontSize: 16, fontWeight: '600', color: p.text },
  })
}
