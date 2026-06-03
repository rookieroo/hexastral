/**
 * Invite-submit helpers — shared by the Threads /invite screen.
 *
 * The server creates the bond + token WITHOUT B's contact info
 * (deliveryMode 'user'); A's own Messages or Mail app sends the invitation,
 * sidestepping cross-jurisdiction commercial-messaging regulation entirely
 * (ADR-0021 §3: user-sends-only, no SMS provider, no email on file).
 */

import type { RelationshipType, ResonanceInviteMailto } from '@zhop/scenario-kindred'
import * as Linking from 'expo-linking'
import { Platform, Share } from 'react-native'
import type { Locale } from './i18n'

/** Localized relationship label sent to the server as `relationshipLabel`. */
export const RELATIONSHIP_LABEL_BY_TYPE: Record<RelationshipType, Record<string, string>> = {
  romantic: { en: 'Partner', zh: '恋人', 'zh-Hant': '戀人', ja: '恋人' },
  friend: { en: 'Friend', zh: '朋友', 'zh-Hant': '朋友', ja: '友人' },
  family: { en: 'Family', zh: '家人', 'zh-Hant': '家人', ja: '家族' },
  partner: { en: 'Business partner', zh: '合伙人', 'zh-Hant': '合夥人', ja: 'パートナー' },
  colleague: { en: 'Colleague', zh: '同事', 'zh-Hant': '同事', ja: '同僚' },
  other: { en: 'Other', zh: '其他', 'zh-Hant': '其他', ja: 'その他' },
}

export function relationshipLabel(type: RelationshipType, locale: Locale): string {
  return RELATIONSHIP_LABEL_BY_TYPE[type][locale] ?? RELATIONSHIP_LABEL_BY_TYPE[type].en ?? 'Other'
}

export function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

/**
 * Backend paywall sentinels surfaced by useSoloBond / useBondInvitation when
 * the free bond limit is reached. Both invite + solo create paths use these.
 */
export function isPaywall(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code
  return code === 'paywall_required' || code === 'subscription_required'
}

/**
 * Hand the server-composed invitation to A's own mail composer. If no mail
 * app is available (typically dev simulators) fall back to the system share
 * sheet so A can send the bond link through any channel. The bond is already
 * pending server-side; the link is all B needs.
 */
export async function deliverInviteMailto(
  recipient: string,
  mailto: ResonanceInviteMailto
): Promise<void> {
  const subject = encodeURIComponent(mailto.subject)
  const body = encodeURIComponent(mailto.body)
  const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${subject}&body=${body}`
  const canOpenMail = await Linking.canOpenURL(mailtoUrl).catch(() => false)
  if (canOpenMail) {
    await Linking.openURL(mailtoUrl)
  } else {
    await Share.share({ message: mailto.body }).catch(() => undefined)
  }
}

/**
 * Hand the invitation to A's own Messages composer (recipient-less `sms:`
 * draft — A picks who it goes to). Same compliance posture as mailto: the
 * message leaves from A's own number, we never see B's contact info
 * (ADR-0021 §3 — this is why there is no SMS-provider integration).
 * Falls back to the system share sheet when SMS isn't available (iPad / dev
 * simulator).
 */
export async function deliverInviteSms(mailto: ResonanceInviteMailto): Promise<void> {
  const body = encodeURIComponent(mailto.body)
  // Recipient-less compose: iOS expects `sms:&body=`, Android `sms:?body=`.
  const smsUrl = Platform.OS === 'android' ? `sms:?body=${body}` : `sms:&body=${body}`
  const canOpenSms = await Linking.canOpenURL(smsUrl).catch(() => false)
  if (canOpenSms) {
    await Linking.openURL(smsUrl)
  } else {
    await Share.share({ message: mailto.body }).catch(() => undefined)
  }
}
