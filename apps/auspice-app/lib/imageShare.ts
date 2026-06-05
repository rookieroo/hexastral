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

/** Hand an already-captured PNG file to the native share sheet. */
async function shareCapturedUri(
  uri: string,
  caption?: string,
  dialogTitle?: string
): Promise<void> {
  if (Platform.OS === 'ios') {
    // iOS carries the image + caption together to most targets (Messages,
    // WeChat, etc.) — image previews instantly, the URL chip resolves async
    // and does NOT block the image.
    await Share.share({ url: uri, message: caption })
  } else if (await Sharing.isAvailableAsync()) {
    // Android RN Share is unreliable for file URIs; expo-sharing handles the
    // content:// grant. Caption support is spotty there, so the baked-in
    // branding carries the funnel.
    await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle })
  } else {
    await Share.share({ url: uri, message: caption })
  }
}

export async function shareViewAsImage(
  ref: React.RefObject<View | null>,
  opts: { caption?: string; dialogTitle?: string } = {}
): Promise<void> {
  if (!ref.current) return
  try {
    const uri = await captureRef(ref, { format: 'png', quality: 1 })
    await shareCapturedUri(uri, opts.caption, opts.dialogTitle)
  } catch {
    // user cancelled, or capture/share unavailable — no-op
  }
}

/**
 * Drives the on-device image share. Two modes:
 *
 *   - on-demand (default): `share(caption)` mounts the off-screen branded card
 *     (the caller renders it when `capturing` is true + attaches `shotRef`),
 *     waits a beat for layout + Skia paint, captures, then unmounts. The delay
 *     matters for Skia — the canvas needs a frame or two before captureRef sees
 *     pixels rather than a blank surface.
 *
 *   - pre-warmed (`prewarm: true`): the card stays mounted off-screen while the
 *     screen has data, and a PNG is captured AHEAD of the tap (re-captured when
 *     `warmKey` changes — e.g. a make-if fork is added). `share()` then hands off
 *     the warm file instantly, with NO capture wait. Used by timeline + make-if,
 *     whose Skia graphs are the slow part of an on-demand capture. Falls back to
 *     the on-demand path automatically if the warm copy isn't ready, so the worst
 *     case is exactly the non-prewarmed behavior.
 */
export function useImageShare(
  opts: { prewarm?: boolean; warmKey?: string | number; delayMs?: number } = {}
) {
  const { prewarm = false, warmKey, delayMs = 320 } = opts
  const shotRef = useRef<View | null>(null)
  const warmedUri = useRef<string | null>(null)
  const [caption, setCaption] = useState<string | null>(null)

  // Pre-warm: the card is mounted continuously (capturing stays true), so capture
  // a fresh PNG shortly after the data/warmKey settles and stash it for the tap.
  useEffect(() => {
    if (!prewarm) return
    warmedUri.current = null
    let cancelled = false
    const id = setTimeout(async () => {
      if (cancelled || !shotRef.current) return
      try {
        warmedUri.current = await captureRef(shotRef, { format: 'png', quality: 1 })
      } catch {
        warmedUri.current = null
      }
    }, delayMs)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [prewarm, warmKey, delayMs])

  // On-demand fallback: mount (if not already), wait, capture, share, unmount.
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

  const share = useCallback(
    async (cap: string) => {
      // Warm copy ready → share instantly, no capture wait.
      if (prewarm && warmedUri.current) {
        try {
          await shareCapturedUri(warmedUri.current, cap)
          return
        } catch {
          // fall through to the on-demand capture path
        }
      }
      setCaption(cap)
    },
    [prewarm]
  )

  // `capturing` keeps the off-screen card mounted: always when pre-warming (so we
  // can capture ahead of the tap), else only during an on-demand share.
  return { shotRef, capturing: prewarm || caption != null, share }
}
