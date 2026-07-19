/**
 * useImageShare — capture an off-screen card to PNG and share it.
 *
 * The card is mounted ONLY while a share is in flight (`capturing`), never
 * during normal reading — so swiping between chapters stays smooth. (An
 * always-mounted 1080×1920 paper card with a QR + seals janked the pager; that
 * pre-warm approach was dropped in favour of mount-on-demand.) On share() we
 * mount the card, let it paint, captureRef → PNG, open the OS share sheet, then
 * unmount. An immediate haptic acks the tap so the ~280ms capture isn't felt.
 *
 * The host renders the card off-screen at `shotRef`, gated on `capturing`.
 */

import * as Haptics from 'expo-haptics'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform, Share, type View } from 'react-native'
import { captureRef } from 'react-native-view-shot'

type SharingModule = typeof import('expo-sharing')
let sharingModule: SharingModule | null | undefined
/** Lazy — stale dev clients may lack the expo-sharing native module. */
function getSharing(): SharingModule | null {
  if (sharingModule !== undefined) return sharingModule
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sharingModule = require('expo-sharing') as SharingModule
    return sharingModule
  } catch {
    sharingModule = null
    return null
  }
}

async function shareCapturedUri(uri: string, caption?: string): Promise<void> {
  if (Platform.OS === 'ios') {
    // iOS carries the image + caption together to most targets (Messages,
    // WeChat…): the image previews instantly, the URL chip resolves async.
    await Share.share({ url: uri, message: caption })
    return
  }
  const Sharing = getSharing()
  if (Sharing && (await Sharing.isAvailableAsync())) {
    // Android RN Share is unreliable for file URIs; expo-sharing handles the
    // content:// grant. Caption support is spotty there, so the baked-in brand
    // (+ QR) carries the funnel.
    await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Xingqi' })
    return
  }
  await Share.share({ url: uri, message: caption })
}

export interface UseImageShareOptions {
  /** Settle delay before capture (ms) — time for the card to paint. Default 280. */
  delayMs?: number
}

export interface UseImageShareResult {
  /** Attach to the off-screen capture target (`collapsable={false}`). */
  shotRef: React.RefObject<View | null>
  /** True while a share is in flight — the host mounts the card ONLY on this. */
  capturing: boolean
  /** Begin a share: mounts the card, captures it, opens the OS share sheet. */
  share: (caption?: string) => void
}

export function useImageShare({ delayMs = 280 }: UseImageShareOptions = {}): UseImageShareResult {
  const shotRef = useRef<View | null>(null)
  const captionRef = useRef<string | undefined>(undefined)
  const [capturing, setCapturing] = useState(false)

  // `capturing` true → the host has mounted the card this render. Wait for it to
  // paint, capture, share, then unmount (set false). Mounting only here is what
  // keeps the pager smooth — nothing heavy renders while the user reads/swipes.
  useEffect(() => {
    if (!capturing) return
    let cancelled = false
    const id = setTimeout(async () => {
      try {
        if (!shotRef.current) return
        const uri = await captureRef(shotRef, { format: 'png', quality: 1 })
        if (!cancelled) await shareCapturedUri(uri, captionRef.current)
      } catch {
        // user cancelled, or capture/share unavailable — no-op
      } finally {
        if (!cancelled) setCapturing(false)
      }
    }, delayMs)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [capturing, delayMs])

  const share = useCallback((caption?: string) => {
    // Immediate tactile ack even though capture is async.
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    captionRef.current = caption
    setCapturing(true)
  }, [])

  return { shotRef, capturing, share }
}
