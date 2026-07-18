import { describe, expect, it } from 'bun:test'
import { buildFaceOraclePrompt } from './faceoracle'

describe('buildFaceOraclePrompt (ADR-0028)', () => {
  it('includes three feature blocks, natal, events schema, and horizon', () => {
    const prompt = buildFaceOraclePrompt({
      faceFeatures: '{"chin":"ok"}',
      palmLeftFeatures: '{"lifeLine":"ok"}',
      palmRightFeatures: '{"lifeLine":"ok"}',
      natalSummary: 'solar=1990-1-1',
      locale: 'zh-CN',
      horizonMonths: 3,
      outputKind: 'oneshot',
    })
    expect(prompt).toContain('FaceFeatures:')
    expect(prompt).toContain('PalmLeftFeatures:')
    expect(prompt).toContain('PalmRightFeatures:')
    expect(prompt).toContain('NatalSummary:')
    expect(prompt).toContain('HorizonMonths: 3')
    expect(prompt).toContain('"events"')
    expect(prompt).toContain('宜留意')
  })
})
