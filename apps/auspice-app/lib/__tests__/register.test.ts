/**
 * Lock the 「黄历原声」 register rule — the ONE derivation behind 宜忌 / 择时 /
 * For-you / push wording:
 *
 * - zh: classical → traditional 原文动词; contemporary（默认）→ modern 白话词.
 * - en/ja: no switch, no 原文 — always the locale vernacular gloss (白话).
 */

import { resolveRegisterSync } from '../yiji-display-mode'

describe('resolveRegisterSync — 黄历原声 register', () => {
  test('zh follows the voice switch', () => {
    expect(resolveRegisterSync('zh-Hans', true)).toBe('traditional')
    expect(resolveRegisterSync('zh-Hans', false)).toBe('modern')
    expect(resolveRegisterSync('zh-Hant', true)).toBe('traditional')
    expect(resolveRegisterSync('zh-Hant', false)).toBe('modern')
  })

  test('non-zh is always vernacular (no classical translations)', () => {
    // en default = modern gloss; ja default = traditional gloss (both 白话, not 原文).
    expect(resolveRegisterSync('en', true)).toBe('modern')
    expect(resolveRegisterSync('en', false)).toBe('modern')
    expect(resolveRegisterSync('ja', true)).toBe('traditional')
    expect(resolveRegisterSync('ja', false)).toBe('traditional')
  })
})
