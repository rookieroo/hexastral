import { describe, expect, test } from 'bun:test'
import {
  FACING_SAMPLE_WARN_DELTA_DEG,
  maxSampleDeltaDeg,
  summarizeFacingSamples,
} from './facing-samples'

describe('facing samples', () => {
  test('summarizes mean and max delta', () => {
    const s = summarizeFacingSamples([178, 180, 182])
    expect(s).not.toBeNull()
    expect(s!.maxDelta).toBeGreaterThanOrEqual(3.9)
    expect(s!.maxDelta).toBeLessThan(5)
    expect(Math.round(s!.mean)).toBe(180)
  })

  test('warn threshold is 8°', () => {
    expect(maxSampleDeltaDeg([0, 10])).toBeGreaterThan(FACING_SAMPLE_WARN_DELTA_DEG)
  })
})
