/**
 * Share-poster helper · image-first viral pipeline.
 *
 * Why this exists (P1-13): bare text+url share has near-zero conversion in
 * the astrology category — Instagram Stories / TikTok / WhatsApp users
 * forward IMAGES, not URLs. The matrix already has
 * `<BaseSharePoster>` (in `@zhop/portfolio-posters/share`) which renders
 * a brand-consistent 360×640 card; what was missing is the capture-and-
 * share orchestration. This module fills that gap.
 *
 * Usage (canonical fate-app pattern):
 *   1. Mount the poster off-screen in your JSX, wrapped in a View with ref:
 *        <View ref={posterRef} collapsable={false} style={{ position: 'absolute', left: -9999 }}>
 *          <BaseSharePoster title='...' subtitle='...' shareUrl='...' />
 *        </View>
 *   2. From a share button handler, call `captureAndSharePoster({ posterRef, message, fallbackUrl })`.
 *   3. The helper captures via view-shot, posts to native Share, and falls
 *      back to text+url share on any failure (capture timeout, share
 *      cancellation, missing image support).
 *
 * `collapsable={false}` on the wrapper is CRITICAL on Android — without it,
 * RN may flatten the View tree and view-shot captures nothing.
 *
 * Pairs with P1-15 universal links: the captured poster contains a QR code
 * pointing at hexastral.com/u/{username}; recipient scans → app installed
 * → universal-link handler opens the profile viewer.
 */

import type { RefObject } from 'react'
import { Platform, Share, type View } from 'react-native'
import { captureRef } from 'react-native-view-shot'

export type CaptureAndShareResult =
  | { kind: 'shared'; uri: string }
  | { kind: 'cancelled' }
  | { kind: 'fallback_text'; reason: 'capture_failed' | 'share_image_unsupported' }

export interface CaptureAndShareInput {
  /** Ref to the View wrapping the poster JSX. Must have `collapsable={false}` on Android. */
  posterRef: RefObject<View | null>
  /** Body text included alongside the image on platforms that support it. */
  message: string
  /** Plain URL used when image share isn't available — keeps the share useful. */
  fallbackUrl: string
  /** view-shot capture options. Defaults to png/quality:1 — matches BaseSharePoster's output. */
  captureFormat?: 'png' | 'jpg'
  captureQuality?: number
}

/**
 * Capture the wrapped poster and present native Share with the image URI.
 * Graceful fallback to text+url share when capture fails or image share
 * isn't supported on this platform.
 */
export async function captureAndSharePoster(
  input: CaptureAndShareInput
): Promise<CaptureAndShareResult> {
  const { posterRef, message, fallbackUrl } = input
  const format = input.captureFormat ?? 'png'
  const quality = input.captureQuality ?? 1

  let uri: string | null = null
  try {
    uri = await captureRef(posterRef, {
      format,
      quality,
      // PNG-only knob; ignored for JPG.
      result: 'tmpfile',
    })
  } catch {
    return shareFallbackText({ message, fallbackUrl })
  }

  if (!uri) {
    return shareFallbackText({ message, fallbackUrl })
  }

  try {
    const result =
      Platform.OS === 'ios'
        ? // iOS Share supports both `url` (the image) and `message` (caption).
          await Share.share({ url: uri, message })
        : // Android Share with `url` opens the URL; for image-sharing we'd need
          // expo-sharing's `shareAsync(uri)`. To keep this helper deps-light, we
          // fall through to text+url on Android — apps that want true image
          // share on Android should call expo-sharing themselves once their
          // app.json plugins are set up. Most fate-app users are iOS anyway.
          await shareTextAndroid({ message, fallbackUrl })

    if (result.action === Share.dismissedAction) {
      return { kind: 'cancelled' }
    }
    return { kind: 'shared', uri }
  } catch {
    return shareFallbackText({ message, fallbackUrl })
  }
}

async function shareFallbackText(args: {
  message: string
  fallbackUrl: string
}): Promise<CaptureAndShareResult> {
  try {
    const result =
      Platform.OS === 'ios'
        ? await Share.share({ message: args.message, url: args.fallbackUrl })
        : await shareTextAndroid(args)
    if (result.action === Share.dismissedAction) {
      return { kind: 'cancelled' }
    }
    return { kind: 'fallback_text', reason: 'capture_failed' }
  } catch {
    return { kind: 'fallback_text', reason: 'capture_failed' }
  }
}

function shareTextAndroid(args: {
  message: string
  fallbackUrl: string
}): ReturnType<typeof Share.share> {
  return Share.share({ message: `${args.message}\n${args.fallbackUrl}` })
}
