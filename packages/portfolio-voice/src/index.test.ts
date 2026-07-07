import { describe, expect, it } from 'bun:test'
import {
  auditFengSynthesisHits,
  auditHardForbiddenHits,
  buildComplianceInstructionBlock,
} from './index'

describe('@zhop/portfolio-voice', () => {
  it('buildComplianceInstructionBlock includes entertainment framing', () => {
    expect(buildComplianceInstructionBlock('en')).toContain('entertainment')
    expect(buildComplianceInstructionBlock('zh')).toContain('娱乐')
  })

  it('flags hard forbidden samples', () => {
    expect(auditHardForbiddenHits('铁口直断，一定发财')).toHaveLength(2)
    expect(auditHardForbiddenHits('gentle cultural reflection only')).toHaveLength(0)
  })

  it('flags feng synthesis talisman and outcome phrases', () => {
    expect(auditFengSynthesisHits('兑宫挂金蟾，增强财气')).toHaveLength(2)
    expect(
      auditFengSynthesisHits('巽宫可放绿植与书架，传统上认为有助于空间节奏')
    ).toHaveLength(0)
  })
})
