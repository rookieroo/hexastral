/**
 * App Store review prompt — at most once per 60 days.
 * iOS enforces its own yearly cap of 3 requests regardless.
 * Uses MMKV (sync) for the timestamp so no async initialization is needed.
 */

import * as StoreReview from 'expo-store-review'
import { storage } from '../storage'

const REVIEW_KEY = 'last_review_prompt_ts'
const COOLDOWN_MS = 60 * 24 * 60 * 60 * 1_000 // 60 days

export async function maybeRequestReview(): Promise<void> {
  const lastPromptStr = storage.getString(REVIEW_KEY)
  if (lastPromptStr) {
    const elapsed = Date.now() - Number(lastPromptStr)
    if (elapsed < COOLDOWN_MS) return
  }

  const canReview = await StoreReview.hasAction()
  if (!canReview) return

  await StoreReview.requestReview()
  storage.set(REVIEW_KEY, String(Date.now()))
}
