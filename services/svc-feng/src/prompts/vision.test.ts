import { describe, expect, test } from 'bun:test'

import {
  buildVisionUserPrompt,
  promptContainsOverlayLies,
  VISION_FORM_SYSTEM_PROMPT,
  VISION_SHA_SYSTEM_PROMPT,
  VISION_SYSTEM_PROMPT,
} from './vision'

describe('vision prompts — no fake overlay contract', () => {
  test('system prompts contain zero overlay-lie keywords', () => {
    for (const blob of [
      VISION_SYSTEM_PROMPT,
      VISION_SHA_SYSTEM_PROMPT,
      VISION_FORM_SYSTEM_PROMPT,
    ]) {
      expect(promptContainsOverlayLies(blob)).toBeNull()
    }
  })

  test('user prompt includes palace→° table and unannotated framing', () => {
    const user = buildVisionUserPrompt({
      facingDegTrue: 180,
      sitDegTrue: 0,
      locale: 'zh',
      imageCount: 2,
      formAzimuthLines: ['水 feature @ 巽'],
    })
    expect(user).toContain('Palace → true-north bearing')
    expect(user).toContain('坎 = 0°')
    expect(user).toContain('unannotated')
    expect(user).toContain('AUTHORITATIVE palace for water/road')
    expect(promptContainsOverlayLies(user)).toBeNull()
  })
})
