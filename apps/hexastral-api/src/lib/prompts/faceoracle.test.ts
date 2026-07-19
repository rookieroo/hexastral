import { describe, expect, it } from 'bun:test'
import { buildFaceOraclePrompt, faceoracleDensityGaps } from './faceoracle'

describe('buildFaceOraclePrompt (ADR-0028 craft)', () => {
  const base = {
    faceFeatures: '{"chin":"ok"}',
    palmLeftFeatures: '{"lifeLine":"ok"}',
    palmRightFeatures: '{"lifeLine":"ok"}',
    natalSummary: 'solar=1990-1-1; dayunTrail=cur:甲子@30-39y/2020-2029',
    locale: 'zh-CN',
    horizonMonths: 3 as const,
    outputKind: 'oneshot' as const,
  }

  it('includes three feature blocks, natal, events schema, and horizon', () => {
    const prompt = buildFaceOraclePrompt(base)
    expect(prompt).toContain('FaceFeatures:')
    expect(prompt).toContain('PalmLeftFeatures:')
    expect(prompt).toContain('PalmRightFeatures:')
    expect(prompt).toContain('NatalSummary:')
    expect(prompt).toContain('HorizonMonths: 3')
    expect(prompt).toContain('"events"')
  })

  it('has six-chapter craft spec and 后半场, no compliance checklist', () => {
    const prompt = buildFaceOraclePrompt(base)
    expect(prompt).toContain('Six chapters')
    expect(prompt).toContain('后半场大运带')
    expect(prompt).toContain('TIME MAIN')
    expect(prompt).not.toContain('App Store 4.3(b)')
    expect(prompt).not.toContain('Safety floor')
    expect(prompt).not.toContain('Terms §3')
  })

  it('does not dump life-scene HARD catalogs', () => {
    const prompt = buildFaceOraclePrompt(base)
    expect(prompt).not.toContain('Life-scene catalog')
    expect(prompt).not.toContain('missing_scene_cluster')
  })
})

describe('faceoracleDensityGaps', () => {
  it('flags thin chapters only', () => {
    const gaps = faceoracleDensityGaps(
      { events: [{ axis: 'career' }, { axis: 'love' }, { axis: 'health' }] },
      [
        {
          kind: 'overview',
          evidence: '短',
          dynamic: '短',
          reef: null,
          remedy: null,
        },
      ]
    )
    expect(gaps.some((g) => g.startsWith('corpus.thin_chapter:overview'))).toBe(true)
    expect(gaps.some((g) => g.includes('scene_cluster'))).toBe(false)
  })
})
