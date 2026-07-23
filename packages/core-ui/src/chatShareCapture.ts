/**
 * Capture an already-mounted chat share preview (jpg, short settle).
 * view-shot / sharing are optional peers — resolve at runtime from the host app.
 */

import * as Haptics from 'expo-haptics'
import type { RefObject } from 'react'
import { Platform, Share, type View } from 'react-native'

type CaptureRef = (
  view: View,
  options: { format: 'jpg'; quality: number; result: 'tmpfile' }
) => Promise<string>

type SharingModule = {
  isAvailableAsync: () => Promise<boolean>
  shareAsync: (
    uri: string,
    options: { mimeType: string; UTI: string; dialogTitle?: string }
  ) => Promise<void>
}

function getCaptureRef(): CaptureRef {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-native-view-shot') as { captureRef: CaptureRef }
  return mod.captureRef
}

function getSharing(): SharingModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-sharing') as SharingModule
  } catch {
    return null
  }
}

export async function captureAndShareVisibleCard(opts: {
  shotRef: RefObject<View | null>
  caption?: string
  delayMs?: number
  dialogTitle?: string
}): Promise<void> {
  const delayMs = opts.delayMs ?? 60
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
  await new Promise<void>((r) => setTimeout(r, delayMs))
  if (!opts.shotRef.current) throw new Error('share_card_missing')
  const uri = await getCaptureRef()(opts.shotRef.current, {
    format: 'jpg',
    quality: 0.85,
    result: 'tmpfile',
  })
  if (Platform.OS === 'ios') {
    await Share.share({ url: uri, message: opts.caption })
    return
  }
  const Sharing = getSharing()
  if (Sharing && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(uri, {
      mimeType: 'image/jpeg',
      UTI: 'public.jpeg',
      dialogTitle: opts.dialogTitle ?? 'Share',
    })
    return
  }
  await Share.share({ url: uri, message: opts.caption })
}
