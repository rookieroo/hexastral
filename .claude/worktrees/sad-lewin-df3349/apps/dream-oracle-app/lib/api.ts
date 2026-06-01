import { runAuto } from '@zhop/portfolio-client'
import type { DreamPreviewSuccess } from '@zhop/scenario-dream'

import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from './growth-config'

export async function runDreamPreview(dreamText: string, locale = 'en') {
  return runAuto({
    target: PORTFOLIO_TARGET_APP,
    input: { dreamText },
    locale,
    anonymousStoragePrefix: PORTFOLIO_STORAGE_PREFIX,
  })
}

/** Maps portfolio preview/linked into the shape expected by @zhop/scenario-dream. */
export async function runDreamPreviewForScenario(
  dreamText: string,
  locale = 'en'
): Promise<DreamPreviewSuccess> {
  const res = await runDreamPreview(dreamText, locale)
  if (res.mode === 'refused') {
    throw new Error(res.reason)
  }
  const raw = res.output
  const interpretation =
    typeof raw === 'object' &&
    raw !== null &&
    'interpretation' in raw &&
    typeof (raw as { interpretation: unknown }).interpretation === 'string'
      ? (raw as { interpretation: string }).interpretation
      : ''
  return { readingId: res.readingId, output: { interpretation } }
}
