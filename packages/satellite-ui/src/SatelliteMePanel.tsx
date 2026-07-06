import { getTokens } from '@zhop/hexastral-tokens/palette'
import type { PortfolioTarget } from '@zhop/portfolio-client'
import { invalidatePortfolioSession } from '@zhop/satellite-runtime'
import type { ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native'

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
  /**
   * When false, hide the embedded history preview on Me; show a single History
   * menu row that navigates to the app's history screen. Default true.
   */
  inlineHistory?: boolean
  labels?: {
    viewAllHistory?: string
    invitePartner?: string
    upgradeToPro?: string
    restorePurchases?: string
    privacyPolicy?: string
    signOut?: string
    settings?: string
  }
  /** When set, renders the flagship-app promo card at the bottom. */
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

function MenuLink({
  label,
  onPress,
  colors,
}: {
  label: string
  onPress: () => void
  colors: ReturnType<typeof getTokens>
}) {
  return (
    <Pressable
      style={[styles.linkBtn, { borderColor: colors.separator }]}
      onPress={onPress}
      accessibilityRole='button'
    >
      <Text style={[styles.linkText, { color: colors.text }]}>{label}</Text>
    </Pressable>
  )
}

export function SatelliteMePanel(props: SatelliteMePanelProps) {
  const colors = getTokens(useColorScheme() === 'dark')
  const inlineHistory = props.inlineHistory !== false

  const signOut = async () => {
    await invalidatePortfolioSession()
    props.onSignedOut?.()
  }

  const showSignOut = props.signOutVisible !== false
  const historyMenuLabel = props.labels?.viewAllHistory ?? props.historyTitle

  const accountMenu = (
    <>
      {props.onOpenSettings ? (
        <MenuLink
          label={props.labels?.settings ?? 'Settings'}
          onPress={props.onOpenSettings}
          colors={colors}
        />
      ) : null}
      {props.onInvite ? (
        <MenuLink
          label={props.labels?.invitePartner ?? 'Invite partner'}
          onPress={props.onInvite}
          colors={colors}
        />
      ) : null}
      <MenuLink
        label={props.labels?.upgradeToPro ?? 'Upgrade to Pro'}
        onPress={props.onUpgrade}
        colors={colors}
      />
      <MenuLink
        label={props.labels?.restorePurchases ?? 'Restore purchases'}
        onPress={props.onRestore}
        colors={colors}
      />
      <MenuLink
        label={props.labels?.privacyPolicy ?? 'Privacy policy'}
        onPress={() => props.onOpenUrl(props.privacyUrl)}
        colors={colors}
      />
      {showSignOut ? (
        <MenuLink
          label={props.labels?.signOut ?? 'Sign out'}
          onPress={() => void signOut()}
          colors={colors}
        />
      ) : null}
    </>
  )

  const tailBlock = (
    <>
      {props.devtoolsSlot ? <View style={styles.devtoolsWrap}>{props.devtoolsSlot}</View> : null}
      {props.promo ? (
        <SatellitePromoCard
          appStoreUrl={props.appStoreUrl}
          title={props.promo.title}
          body={props.promo.body}
          ctaLabel={props.promo.ctaLabel}
        />
      ) : null}
    </>
  )

  const authHeaderBlock = props.authHeader ? (
    <View
      style={[styles.authHeader, { borderColor: colors.separator, backgroundColor: colors.card }]}
    >
      {props.authHeader}
    </View>
  ) : null

  const menuPanel = (
    <View style={{ gap: 12 }}>
      <MenuLink label={historyMenuLabel} onPress={props.onViewHistory} colors={colors} />
      {accountMenu}
      {tailBlock}
    </View>
  )

  if (!inlineHistory) {
    return (
      <ScrollView
        contentContainerStyle={styles.menuScroll}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        {authHeaderBlock}
        {menuPanel}
      </ScrollView>
    )
  }

  const listHeader = (
    <View style={{ gap: 12 }}>
      {authHeaderBlock}
      <Text style={[styles.h1, { color: colors.text }]}>{props.historyTitle}</Text>
    </View>
  )

  const listFooter = (
    <View style={{ gap: 12 }}>
      <MenuLink label={historyMenuLabel} onPress={props.onViewHistory} colors={colors} />
      {accountMenu}
      {tailBlock}
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
  menuScroll: { padding: 16, gap: 12, paddingBottom: 32 },
  authHeader: { borderWidth: 0.5, borderRadius: 14, padding: 14, gap: 10 },
  devtoolsWrap: { gap: 8 },
  h1: { fontSize: 18, fontWeight: '600' },
  linkBtn: {
    borderWidth: 0.5,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  linkText: { letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 12 },
})
