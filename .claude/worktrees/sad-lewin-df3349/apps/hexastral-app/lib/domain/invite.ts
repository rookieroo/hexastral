/**
 * Invite — Deep link generation + sharing for Bonds invite flow
 *
 * Generates a unique invite URL with the current user's referral ID.
 * When recipient downloads + registers, the bond is auto-established.
 */

import * as SecureStore from 'expo-secure-store'
import { Linking, Platform, Share } from 'react-native'
import { config } from '../config'

const BASE_URL = 'https://hexastral.com/invite'
const HEHUN_BASE_URL = 'https://hexastral.com'

/** Generate invite deep link with current user's ID */
export async function getInviteLink(): Promise<string> {
  const userId = await SecureStore.getItemAsync('user_id')
  if (!userId) return BASE_URL
  return `${BASE_URL}?ref=${encodeURIComponent(userId)}`
}

/**
 * Open native SMS app with pre-filled invitation message.
 * If the device cannot open SMS, falls back to the share sheet.
 */
export async function sendSMSInvite(message: string, phoneNumber?: string): Promise<boolean> {
  const link = await getInviteLink()
  const body = `${message} ${link}`
  const recipient = phoneNumber ? encodeURIComponent(phoneNumber) : ''
  // iOS uses '&body=', Android uses '?body='
  const sep = Platform.OS === 'ios' ? '&' : '?'
  const smsUrl = `sms:${recipient}${sep}body=${encodeURIComponent(body)}`
  try {
    const canOpen = await Linking.canOpenURL(smsUrl)
    if (canOpen) {
      await Linking.openURL(smsUrl)
      return true
    }
  } catch {
    // fall through to share sheet
  }
  // Fallback: generic share sheet
  return shareInvite(message)
}

/** Open native share sheet with invite message */
export async function shareInvite(message: string): Promise<boolean> {
  const link = await getInviteLink()
  try {
    const result = await Share.share({ message: `${message} ${link}` })
    return result.action === Share.sharedAction
  } catch {
    return false
  }
}

/**
 * Generate a hehun (compatibility) invite link via DDL.
 *
 * Creates a DDL session with the inviter's userId and bondId,
 * so when the partner opens the link, fills in birth data on web,
 * and downloads the app, the DDL payload carries the bond context.
 *
 * Returns a shareable URL like https://hexastral.com/hehun/{token}
 */
export async function getHehunInviteLink(bondId: string): Promise<string | null> {
  const userId = await SecureStore.getItemAsync('user_id')
  if (!userId) return null

  try {
    const res = await fetch(`${config.apiUrl}/api/ddl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fingerprint: { screenWidth: 0, screenHeight: 0, timezone: '', platform: 'ios' },
        meta: {
          payload: {
            mode: 'pairing',
            bondId,
            inviterUserId: userId,
            source: 'hehun_invite',
          },
        },
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { token: string }
    return `${HEHUN_BASE_URL}/hehun/${data.token}`
  } catch {
    return null
  }
}

/** Share a hehun invite link via the native share sheet */
export async function shareHehunInvite(message: string, bondId: string): Promise<boolean> {
  const link = await getHehunInviteLink(bondId)
  if (!link) return false
  try {
    const result = await Share.share({ message: `${message} ${link}` })
    return result.action === Share.sharedAction
  } catch {
    return false
  }
}
