/**
 * 通用分享工具
 *
 * shareBondAsLink   – 打开原生分享弹窗，分享链接（Web OG 联动）
 * shareBondAsPoster – 截图 ViewShot → 打开原生分享弹窗，分享图片（旧路径，新功能避免使用）
 * shareReportAsLink – 通用 report 分享：创建 snapshot → 打开原生 Share Sheet（含 URL）
 */

import * as SecureStore from 'expo-secure-store'
import * as Sharing from 'expo-sharing'
import type { RefObject } from 'react'
import { Share } from 'react-native'
import type ViewShot from 'react-native-view-shot'
import { apiClient } from '@/lib/api'
import { unwrapApiEnvelope } from '@/lib/api-envelope'
import { hapticMedium } from '@/lib/ux/haptics'

/** Share bond result as a URL (for WhatsApp, Discord, Twitter, etc.) */
export async function shareBondAsLink(shareUrl: string, title: string): Promise<void> {
  hapticMedium()
  await Share.share({
    message: `${title}\n${shareUrl}`,
    url: shareUrl,
  })
}

/** Capture poster image via ViewShot ref and share as image (for IG Stories, TikTok, etc.) */
export async function shareBondAsPoster(viewShotRef: RefObject<ViewShot | null>): Promise<void> {
  hapticMedium()
  const uri = await viewShotRef.current?.capture?.()
  if (!uri) return

  const isAvailable = await Sharing.isAvailableAsync()
  if (isAvailable) {
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: 'Share Bond',
    })
  }
}

/**
 * Generic report share — creates a server-side snapshot, then opens the
 * native iOS / Android Share Sheet with the URL pointing at hexastral-web.
 * Web OG (`/report/[shareId]/opengraph-image.tsx`) renders the social card.
 *
 * Throws on snapshot creation failure so caller can surface UI feedback.
 */
export async function shareReportAsLink(args: {
  reportType: 'fate' | 'natal' | 'stellar' | 'yiching' | 'physiognomy' | 'pair'
  reportId: string
  title: string
  /** JSON-encoded snapshot — what hexastral-web will render. */
  contentJson: string
  titleHint?: string
}): Promise<{ shareId: string; url: string }> {
  hapticMedium()
  const userId = (await SecureStore.getItemAsync('user_id')) ?? ''
  if (!userId) {
    throw new Error('share_requires_signed_in_user')
  }
  const resp = await apiClient.api.share.$post({
    json: {
      userId,
      reportType: args.reportType,
      reportId: args.reportId,
      contentJson: args.contentJson,
      titleHint: args.titleHint,
    },
  })
  if (!resp.ok) {
    throw new Error(`share_create_failed: ${resp.status}`)
  }
  const { shareId, url } = await unwrapApiEnvelope<{ shareId: string; url: string }>(resp)
  await Share.share({
    message: `${args.title}\n${url}`,
    url,
  })
  return { shareId, url }
}
