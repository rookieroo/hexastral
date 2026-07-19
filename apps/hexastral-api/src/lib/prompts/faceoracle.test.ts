import { describe, expect, it } from 'bun:test'
import { buildFaceOraclePrompt } from './faceoracle'

describe('buildFaceOraclePrompt (ADR-0028 + ADR-0003)', () => {
  const base = {
    faceFeatures: '{"chin":"ok"}',
    palmLeftFeatures: '{"lifeLine":"ok"}',
    palmRightFeatures: '{"lifeLine":"ok"}',
    natalSummary: 'solar=1990-1-1',
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
    expect(prompt).toContain('宜留意')
  })

  it('injects portfolio-voice compliance block', () => {
    const prompt = buildFaceOraclePrompt(base)
    expect(prompt).toContain('App Store 4.3(b)')
    expect(prompt).toContain('Terms §3')
  })

  it('includes health boundary and density schema', () => {
    const prompt = buildFaceOraclePrompt(base)
    expect(prompt).toContain('Health axis boundary')
    expect(prompt).toContain('专业医师')
    expect(prompt).toContain('diagnosis')
    expect(prompt).toContain('"axis": "career" | "love" | "health"')
    expect(prompt).toContain('"citations"')
  })

  it('keeps specificity voice (not empty pep talk)', () => {
    const prompt = buildFaceOraclePrompt(base)
    expect(prompt).toContain('empty positivity')
    expect(prompt).toContain('内修参考')
  })
})
