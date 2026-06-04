/**
 * On-device image sharing — capture a view to a PNG and hand the FILE to the
 * native share sheet. This is the fix for two complaints about URL-only shares:
 *
 *   1. "can't share the graph as an image" — captureRef snapshots the actual
 *      on-screen view (the real Skia git-graph + its labels), so the share IS
 *      what you see, not a server reconstruction.
 *   2. "tapping share takes forever" — a URL share makes iOS block on fetching
 *      the link's OG image from a cold Worker (seconds). A local PNG needs no
 *      network: the sheet appears instantly and every social app previews an
 *      image natively (it IS the image).
 *
 * The `caption` (a tagline + the /s/ landing URL) rides along on iOS so the
 * install funnel + SEO page still travel with the image; the image is the
 * preview, the URL is the tap-through. Branding + hexastral.com are also baked
 * INTO the captured card (see components/ShareableCard) so an image stripped of
 * its caption still markets itself.
 */

import * as Sharing from 'expo-sharing'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform, Share, type View } from 'react-native'
import { captureRef } from 'react-native-view-shot'

export async function shareViewAsImage(
  ref: React.RefObject<View | null>,
  opts: { caption?: string; dialogTitle?: string } = {}
): Promise<void> {
  if (!ref.current) return
  try {
    const uri = await captureRef(ref, { format: 'png', quality: 1 })
    if (Platform.OS === 'ios') {
      // iOS carries the image + caption together to most targets (Messages,
      // WeChat, etc.) — image previews instantly, the URL chip resolves async
      // and does NOT block the image.
      await Share.share({ url: uri, message: opts.caption })
    } else if (await Sharing.isAvailableAsync()) {
      // Android RN Share is unreliable for file URIs; expo-sharing handles the
      // content:// grant. Caption support is spotty there, so the baked-in
      // branding carries the funnel.
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: opts.dialogTitle,
      })
    } else {
      await Share.share({ url: uri, message: opts.caption })
    }
  } catch {
    // user cancelled, or capture/share unavailable — no-op
  }
}

/**
 * Drives a capture-on-demand flow: `share(caption)` mounts an off-screen
 * branded card (the caller renders it when `capturing` is true and attaches
 * `shotRef`), waits a beat for layout + Skia paint, captures it, then unmounts.
 *
 * The delay matters for Skia: the canvas needs a frame or two to draw before
 * captureRef will see pixels rather than a blank surface.
 */
export function useImageShare(delayMs = 320) {
  const shotRef = useRef<View | null>(null)
  const [caption, setCaption] = useState<string | null>(null)

  useEffect(() => {
    if (caption == null) return
    let cancelled = false
    const id = setTimeout(async () => {
      try {
        await shareViewAsImage(shotRef, { caption })
      } finally {
        if (!cancelled) setCaption(null)
      }
    }, delayMs)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [caption, delayMs])

  const share = useCallback((cap: string) => setCaption(cap), [])

  return { shotRef, capturing: caption != null, share }
}
