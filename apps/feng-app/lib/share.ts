import * as Haptics from 'expo-haptics'
import { Share } from 'react-native'
import { config } from './config'
import { signRequest } from './hmac'
import { getStoredFengUserId } from './user-session'

export async function shareFengChapter(args: {
  reportId: string
  chapterKind: string
  title: string
  contentJson: string
}): Promise<{ shareId: string; url: string }> {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

  const userId = await getStoredFengUserId()
  if (!userId) {
    throw new Error('share_requires_signed_in_user')
  }

  const body = JSON.stringify({
    userId,
    reportType: 'feng',
    reportId: args.reportId,
    titleHint: args.title,
    contentJson: args.contentJson,
  })

  const headers = await signRequest({
    method: 'POST',
    path: '/api/share',
    body,
    userId,
  })

  const resp = await fetch(`${config.apiUrl}/api/share`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userId}`,
      ...headers,
    },
    body,
  })

  if (!resp.ok) {
    throw new Error(`share_create_failed: ${resp.status}`)
  }

  const { shareId, url } = (await resp.json()) as { shareId: string; url: string }

  await Share.share({
    message: `${args.title}\n${url}`,
    url,
  })

  return { shareId, url }
}
