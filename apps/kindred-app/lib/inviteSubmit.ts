/**
 * Invite-submit helpers — shared by the Threads /invite screen.
 *
 * The server creates the bond + token WITHOUT B's contact info
 * (deliveryMode 'user'); A hands the invitation to the system share sheet and
 * sends it through whatever channel they like — Messages, WhatsApp, WeChat,
 * Mail, AirDrop — sidestepping cross-jurisdiction commercial-messaging
 * regulation entirely (ADR-0021 §3: user-sends-only, no provider, no contact
 * info on file). The invite link lives in the shared message body.
 */

import type { RelationshipType, ResonanceInviteMailto } from '@zhop/scenario-kindred'
import { Platform, Share } from 'react-native'
import type { Locale } from './i18n'

/** Localized relationship label sent to the server as `relationshipLabel`. */
export const RELATIONSHIP_LABEL_BY_TYPE: Record<RelationshipType, Record<string, string>> = {
  romantic: { en: 'Partner', zh: '恋人', 'zh-Hant': '戀人', ja: '恋人' },
  family: { en: 'Family', zh: '家人', 'zh-Hant': '家人', ja: '家族' },
  // 紫微-palace-aligned — the LABEL is the concrete kin/role term so
  // labelToBondCategory normalizes it (父母→parent, 子女→child, 兄弟姐妹→sibling,
  // 上司→boss, 合伙人→colleague), firing the right palace lens.
  parent: { en: 'Parent', zh: '父母', 'zh-Hant': '父母', ja: '親' },
  child: { en: 'Child', zh: '子女', 'zh-Hant': '子女', ja: '子女' },
  sibling: { en: 'Sibling', zh: '兄弟姐妹', 'zh-Hant': '兄弟姊妹', ja: '兄弟姉妹' },
  friend: { en: 'Friend', zh: '朋友', 'zh-Hant': '朋友', ja: '友人' },
  boss: { en: 'Boss', zh: '上司', 'zh-Hant': '上司', ja: '上司' },
  colleague: { en: 'Colleague', zh: '同事', 'zh-Hant': '同事', ja: '同僚' },
  partner: { en: 'Cofounder', zh: '合伙人', 'zh-Hant': '合夥人', ja: 'パートナー' },
  other: { en: 'Other', zh: '其他', 'zh-Hant': '其他', ja: 'その他' },
}

export function relationshipLabel(type: RelationshipType, locale: Locale): string {
  return RELATIONSHIP_LABEL_BY_TYPE[type][locale] ?? RELATIONSHIP_LABEL_BY_TYPE[type].en ?? 'Other'
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
 * Hand the server-composed invitation to the system share sheet so A can send
 * the bond link through any channel (Messages, WhatsApp, WeChat, Mail, AirDrop…).
 * The bond is already pending server-side; the link is all B needs.
 *
 * The server composes the link INTO the body. On iOS we lift it out into Share's
 * `url` item so AirDrop / social treat it as a LINK: AirDrop opens the resonate
 * webpage (and deep-links into the app via the hexastral.com Universal Link)
 * instead of dropping text into Pages, and the page's opengraph-image renders a
 * rich card. SMS / Mail still get the text + a tappable link (unchanged). Android
 * Share has no `url` field, so keep the link inline there.
 */
export async function shareInvite(
  mailto: ResonanceInviteMailto,
  resonateUrl: string
): Promise<void> {
  if (Platform.OS === 'ios') {
    const text = mailto.body
      .replace(resonateUrl, '')
      .replace(/\n{2,}/g, '\n')
      .trim()
    await Share.share({ message: text, url: resonateUrl }).catch(() => undefined)
    return
  }
  await Share.share({ message: mailto.body }).catch(() => undefined)
}
