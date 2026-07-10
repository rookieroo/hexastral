import { describe, expect, test } from 'bun:test'
import { computeFormAzimuths } from './form-azimuth'

describe('computeFormAzimuths', () => {
  test('maps water point east of site to 震 palace', () => {
    const siteLat = 1.29
    const siteLng = 103.85
    const eastLng = siteLng + 0.002
    const features = [
      {
        type: 'Feature',
        properties: { layer: 'water' },
        geometry: { type: 'Point', coordinates: [eastLng, siteLat] },
      },
    ]
    const out = computeFormAzimuths(siteLat, siteLng, features, [])
    expect(out.length).toBe(1)
    expect(out[0]?.kind).toBe('water')
    expect(out[0]?.palace).toBe('震')
    expect(out[0]?.source).toBe('tilequery')
    expect(out[0]?.distanceM).toBeGreaterThan(0)
  })

  test('maps road point north of site to 坎 palace', () => {
    const siteLat = 1.29
    const siteLng = 103.85
    const northLat = siteLat + 0.002
    const features = [
      {
        type: 'Feature',
        properties: { layer: 'road' },
        geometry: { type: 'Point', coordinates: [siteLng, northLat] },
      },
    ]
    const out = computeFormAzimuths(siteLat, siteLng, [], features)
    expect(out.length).toBe(1)
    expect(out[0]?.kind).toBe('road')
    expect(out[0]?.palace).toBe('坎')
  })

  test('dedupes multiple points in same palace keeping nearest', () => {
    const siteLat = 1.29
    const siteLng = 103.85
    const features = [
      {
        type: 'Feature',
        properties: { layer: 'water' },
        geometry: { type: 'Point', coordinates: [siteLng + 0.01, siteLat] },
      },
      {
        type: 'Feature',
        properties: { layer: 'water' },
        geometry: { type: 'Point', coordinates: [siteLng + 0.001, siteLat] },
      },
    ]
    const out = computeFormAzimuths(siteLat, siteLng, features, [])
    const water震 = out.filter((f) => f.kind === 'water' && f.palace === '震')
    expect(water震.length).toBe(1)
    expect(water震[0]?.distanceM).toBeLessThan(200)
  })
})
