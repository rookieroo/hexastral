import { describe, expect, test } from 'bun:test'
import { isKindredPushRouteAllowed } from './timeline-push-route'

describe('isKindredPushRouteAllowed', () => {
  test('accepts timeline group and bare timeline paths', () => {
    expect(isKindredPushRouteAllowed('/(timeline)')).toBe(true)
    expect(isKindredPushRouteAllowed('/(timeline)/node')).toBe(true)
    expect(isKindredPushRouteAllowed('/timeline')).toBe(true)
    expect(isKindredPushRouteAllowed('/timeline/abc')).toBe(true)
  })

  test('accepts bonds routes', () => {
    expect(isKindredPushRouteAllowed('/(bonds)/xyz')).toBe(true)
    expect(isKindredPushRouteAllowed('/bonds/xyz')).toBe(true)
  })

  test('rejects hexastral leftovers and open redirects', () => {
    expect(isKindredPushRouteAllowed('/(tabs)/home')).toBe(false)
    expect(isKindredPushRouteAllowed('/(app)/settings')).toBe(false)
    expect(isKindredPushRouteAllowed('https://evil.example')).toBe(false)
    expect(isKindredPushRouteAllowed('/(reading)')).toBe(false)
  })
})
