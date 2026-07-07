import { describe, expect, it } from 'bun:test'
import {
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
})
