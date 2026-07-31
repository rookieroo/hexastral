import { describe, expect, test } from 'bun:test'
import { rewriteKindredSystemPath } from '../app/+native-intent'

describe('rewriteKindredSystemPath', () => {
  test('rewrites pathname resonate → accept', () => {
    expect(rewriteKindredSystemPath('/resonate/tok_abc')).toBe('/accept/tok_abc')
  })

  test('rewrites custom-scheme resonate', () => {
    expect(rewriteKindredSystemPath('yuel://resonate/tok_abc')).toBe('/accept/tok_abc')
  })

  test('rewrites hostful https UL', () => {
    expect(rewriteKindredSystemPath('https://yuel.hexastral.com/resonate/tok_abc')).toBe(
      '/accept/tok_abc'
    )
  })

  test('normalizes accept scheme CTA', () => {
    expect(rewriteKindredSystemPath('yuel:///accept/tok_abc')).toBe('/accept/tok_abc')
    expect(rewriteKindredSystemPath('/accept/tok_abc')).toBe('/accept/tok_abc')
  })

  test('preserves query on reading rewrite', () => {
    expect(rewriteKindredSystemPath('yuel://reading?date=2020-01-01')).toBe(
      '/(reading)/full?date=2020-01-01'
    )
  })

  test('passes through unknown paths', () => {
    expect(rewriteKindredSystemPath('/(timeline)')).toBe('/(timeline)')
  })
})
