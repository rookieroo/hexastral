import { getTokens } from '@zhop/hexastral-tokens/palette'
import type { PortfolioTarget } from '@zhop/portfolio-client'
import { invalidatePortfolioSession } from '@zhop/satellite-runtime'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native'

import { SatelliteHistoryList } from './SatelliteHistoryList'
import { SatellitePromoCard } from './SatellitePromoCard'

export interface SatelliteMePanelProps {
  target: PortfolioTarget
  historyTitle: string
  emptyText: string
  privacyUrl: string
  appStoreUrl: string
  onOpenUrl: (url: string) => void
  onViewHistory: () => void
  onUpgrade: () => void
  onRestore: () => void
  onOpenSettings?: () => void
  onSignedOut?: () => void
  onInvite?: () => void
  labels?: {
    viewAllHistory?: string
    invitePartner?: string
    upgradeToPro?: string
    restorePurchases?: string
    privacyPolicy?: string
    signOut?: string
    settings?: string
  }
  promo?: {
    title?: string
    body?: string
    ctaLabel?: string
  }
  /** Optional dev-only block (e.g. reset flags); app decides visibility. */
  devtoolsSlot?: ReactNode
  /**
   * When set, rendered above the history block (e.g. Apple sign-in card for logged-out users).
   */
  authHeader?: ReactNode
  /**
   * When false, the Sign out row is hidden (default true for backward compatibility).
   */
  signOutVisible?: boolean
}

export function SatelliteMePanel(props: SatelliteMePanelProps) {
  const colors = getTokens(useColorScheme() === 'dark')

  const signOut = async () => {
    await invalidatePortfolioSession()
    props.onSignedOut?.()
  }

  const showSignOut = props.signOutVisible !== false

  const listHeader = (
    <View style={{ gap: 12 }}>
      {props.authHeader ? (
        <View
          style={[
            styles.authHeader,
            { borderColor: colors.separator, backgroundColor: colors.card },
          ]}
        >
          {props.authHeader}
        </View>
      ) : null}
      <Text style={[styles.h1, { color: colors.text }]}>{props.historyTitle}</Text>
    </View>
  )

  const listFooter = (
    <View style={{ gap: 12 }}>
      <Pressable
        style={[styles.linkBtn, { borderColor: colors.separator }]}
        onPress={props.onViewHistory}
        accessibilityRole='button'
      >
        <Text style={[styles.linkText, { color: colors.text }]}>
          {props.labels?.viewAllHistory ?? 'View all history'}
        </Text>
      </Pressable>
      {props.onOpenSettings ? (
        <Pressable
          style={[styles.linkBtn, { borderColor: colors.separator }]}
          onPress={props.onOpenSettings}
          accessibilityRole='button'
        >
          <Text style={[styles.linkText, { color: colors.text }]}>
            {props.labels?.settings ?? 'Settings'}
          </Text>
        </Pressable>
      ) : null}
      {props.onInvite ? (
        <Pressable
          style={[styles.linkBtn, { borderColor: colors.separator }]}
          onPress={props.onInvite}
          accessibilityRole='button'
        >
          <Text style={[styles.linkText, { color: colors.text }]}>
            {props.labels?.invitePartner ?? 'Invite partner'}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        style={[styles.linkBtn, { borderColor: colors.separator }]}
        onPress={props.onUpgrade}
        accessibilityRole='button'
      >
        <Text style={[styles.linkText, { color: colors.text }]}>
          {props.labels?.upgradeToPro ?? 'Upgrade to Pro'}
        </Text>
      </Pressable>
      <Pressable
        style={[styles.linkBtn, { borderColor: colors.separator }]}
        onPress={props.onRestore}
        accessibilityRole='button'
      >
        <Text style={[styles.linkText, { color: colors.text }]}>
          {props.labels?.restorePurchases ?? 'Restore purchases'}
        </Text>
      </Pressable>
      <Pressable
        style={[styles.linkBtn, { borderColor: colors.separator }]}
        onPress={() => props.onOpenUrl(props.privacyUrl)}
        accessibilityRole='button'
      >
        <Text style={[styles.linkText, { color: colors.text }]}>
          {props.labels?.privacyPolicy ?? 'Privacy policy'}
        </Text>
      </Pressable>
      {showSignOut ? (
        <Pressable
          style={[styles.linkBtn, { borderColor: colors.separator }]}
          onPress={() => void signOut()}
          accessibilityRole='button'
        >
          <Text style={[styles.linkText, { color: colors.text }]}>
            {props.labels?.signOut ?? 'Sign out'}
          </Text>
        </Pressable>
      ) : null}
      {props.devtoolsSlot ? <View style={styles.devtoolsWrap}>{props.devtoolsSlot}</View> : null}
      <SatellitePromoCard
        appStoreUrl={props.appStoreUrl}
        title={props.promo?.title}
        body={props.promo?.body}
        ctaLabel={props.promo?.ctaLabel}
      />
    </View>
  )

  return (
    <SatelliteHistoryList
      target={props.target}
      emptyText={props.emptyText}
      listHeader={listHeader}
      listFooter={listFooter}
    />
  )
}

const styles = StyleSheet.create({
  authHeader: { borderWidth: 0.5, borderRadius: 0, padding: 14, gap: 10 },
  devtoolsWrap: { gap: 8 },
  h1: { fontSize: 18, fontWeight: '600' },
  linkBtn: {
    borderWidth: 0.5,
    paddingVertical: 10,
    alignItems: 'center',
  },
  linkText: { letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 12 },
})
