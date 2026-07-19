import { describe, expect, test } from 'bun:test'

import {
  featuresUnchangedPayload,
  parseReadingFeatureIds,
  sameFaceoracleFeatures,
} from './faceoracle-job-dedupe'
import {
  computeFaceoracleVlmContentHash,
  decodeImageBase64,
  FACEORACLE_VLM_MODEL,
  FACEORACLE_VLM_SCHEMA_VERSION,
} from './faceoracle-vlm-cache'

describe('faceoracle-job-dedupe', () => {
  test('sameFaceoracleFeatures equality', () => {
    const a = {
      faceFeatureId: 'f1',
      palmLeftFeatureId: 'l1',
      palmRightFeatureId: 'r1',
    }
    expect(sameFaceoracleFeatures(a, { ...a })).toBe(true)
    expect(
      sameFaceoracleFeatures(a, {
        ...a,
        faceFeatureId: 'f2',
      })
    ).toBe(false)
  })

  test('parseReadingFeatureIds reads portfolio inputJson', () => {
    const ids = parseReadingFeatureIds(
      JSON.stringify({
        faceFeatureId: 'f',
        palmLeftFeatureId: 'l',
        palmRightFeatureId: 'r',
        extra: 1,
      })
    )
    expect(ids).toEqual({
      faceFeatureId: 'f',
      palmLeftFeatureId: 'l',
      palmRightFeatureId: 'r',
    })
    expect(parseReadingFeatureIds('{}')).toBeNull()
    expect(parseReadingFeatureIds('not-json')).toBeNull()
  })

  test('featuresUnchangedPayload includes code + readingId', () => {
    const p = featuresUnchangedPayload('rid-1')
    expect(p.error).toBe('features_unchanged')
    expect(p.code).toBe('features_unchanged')
    expect(p.readingId).toBe('rid-1')
  })
})

describe('faceoracle-vlm-cache', () => {
  test('decodeImageBase64 round-trip length', () => {
    const raw = new Uint8Array([1, 2, 3, 255])
    let b64 = ''
    for (let i = 0; i < raw.length; i++) b64 += String.fromCharCode(raw[i]!)
    const encoded = btoa(b64)
    const decoded = decodeImageBase64(encoded)
    expect([...decoded]).toEqual([1, 2, 3, 255])
  })

  test('content hash stable for same bytes; differs by type', async () => {
    const bytes = new Uint8Array([10, 20, 30, 40])
    const a = await computeFaceoracleVlmContentHash({ imageBytes: bytes, type: 'face' })
    const b = await computeFaceoracleVlmContentHash({ imageBytes: bytes, type: 'face' })
    const c = await computeFaceoracleVlmContentHash({ imageBytes: bytes, type: 'palm_l' })
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a).toHaveLength(64)
  })

  test('model / schema bump changes hash', async () => {
    const bytes = new Uint8Array([9, 8, 7])
    const base = await computeFaceoracleVlmContentHash({ imageBytes: bytes, type: 'face' })
    const modelBump = await computeFaceoracleVlmContentHash({
      imageBytes: bytes,
      type: 'face',
      model: `${FACEORACLE_VLM_MODEL}-x`,
    })
    const schemaBump = await computeFaceoracleVlmContentHash({
      imageBytes: bytes,
      type: 'face',
      schemaVersion: `${FACEORACLE_VLM_SCHEMA_VERSION}-x`,
    })
    expect(base).not.toBe(modelBump)
    expect(base).not.toBe(schemaBump)
  })
})
