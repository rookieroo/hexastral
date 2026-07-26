/**
 * Offline prose eval fixtures — direction/palace consistency + locale gate.
 */

import { describe, expect, test } from 'bun:test'
import { auditFormLiNotes, auditSynthesisFactsHard } from './form-li-notes-audit'
import { fengBodyLooksWrongLocale } from './locale-gate'
import { FormLiNotesSchema } from '../prompts/form-li-notes'

const compute = {
  summary: { sit: '子', face: '午' },
  patterns: [{ kind: '旺山旺向', name: '旺山旺向' }],
  combinations: [
    { palace: '巽', mountainStar: 2, facingStar: 5, name: '二五交加' },
    { palace: '兑', mountainStar: 8, facingStar: 1 },
  ],
}

describe('feng prose eval harness', () => {
  test('golden mid notes pass audit', () => {
    const notes = FormLiNotesSchema.parse({
      schemaVersion: 1,
      locale: 'zh',
      bullets: [
        {
          palace: '巽',
          seen: '近处路冲感',
          linkToChart: '山2向5 二五交加',
          severity: 'watch',
        },
        {
          palace: '兑',
          seen: '低处见水',
          linkToChart: 'no_chart_link',
          severity: 'info',
        },
      ],
      omittedSignals: [],
      inventedFacing: false,
    })
    expect(auditFormLiNotes(notes, compute).ok).toBe(true)
  })

  test('wrong palace star pair fails', () => {
    const notes = FormLiNotesSchema.parse({
      schemaVersion: 1,
      locale: 'zh',
      bullets: [
        {
          palace: '巽',
          seen: '路冲',
          linkToChart: '山9向9 不符',
          severity: 'risk',
        },
      ],
      omittedSignals: [],
      inventedFacing: false,
    })
    expect(auditFormLiNotes(notes, compute).ok).toBe(false)
  })

  test('synth chapter inventing shanXiang fails hard audit', () => {
    const result = auditSynthesisFactsHard(
      [
        {
          kind: 'flying_stars',
          title: '飞星',
          goldenLine: '试',
          body: '巽宫山1向3 不合盘面',
        },
      ],
      compute
    )
    expect(result.ok).toBe(false)
  })

  test('en locale drift detected on Chinese chapter body', () => {
    const body =
      '外峦头形势显示巽宫有路冲，坤宫砂高，来龙在乾，水口在兑，应当谨慎化解并调整室内布局。'.repeat(2)
    expect(fengBodyLooksWrongLocale('en', body)).toBe(true)
  })
})
