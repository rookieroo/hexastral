import { runLinked, runPreview } from '@zhop/portfolio-client'
import { getPortfolioUserId } from '@zhop/satellite-runtime'
import * as FileSystem from 'expo-file-system'

import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from './growth-config'

async function buildFaceInput(imageUrl?: string): Promise<Record<string, unknown>> {
  let imageBase64: string | undefined
  if (imageUrl?.startsWith('file://')) {
    imageBase64 = await FileSystem.readAsStringAsync(imageUrl, { encoding: 'base64' })
  }
  return {
    imageUrl: imageUrl && !imageUrl.startsWith('file://') ? imageUrl : undefined,
    imageBase64,
    mode: 'face' as const,
  }
}

/**
 * Free teaser — a cheap canned-feature reading with no Gemini Vision spend.
 * Always uses the anonymous /preview path, even for signed-in users, so a
 * non-entitled user still sees the teaser instead of a paywall error (K.3).
 */
export async function runFaceTeaser(imageUrl?: string, locale = 'en') {
  return runPreview({
    target: PORTFOLIO_TARGET_APP,
    input: await buildFaceInput(imageUrl),
    locale,
    anonymousStoragePrefix: PORTFOLIO_STORAGE_PREFIX,
  })
}

/**
 * Paid full report — runs the real Gemini Vision extraction server-side. Hits
 * the authed /linked path, which is gated behind the `faceoracle_pro`
 * entitlement (auth + IAP). Throws `signin_required` when there's no portfolio
 * session yet; a 402 surfaces as a quota/entitlement error → route to paywall.
 */
export async function runFaceFull(imageUrl: string | undefined, locale = 'en') {
  const userId = await getPortfolioUserId()
  if (!userId) throw new Error('signin_required')
  return runLinked({
    target: PORTFOLIO_TARGET_APP,
    input: await buildFaceInput(imageUrl),
    locale,
    userId,
    anonymousStoragePrefix: PORTFOLIO_STORAGE_PREFIX,
  })
}
