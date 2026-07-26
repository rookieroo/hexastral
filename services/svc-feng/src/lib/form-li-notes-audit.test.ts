/**
 * Mid-pass FormLiNotes schema + hard audit gates (plan §5.2).
 */

import { describe, expect, test } from 'bun:test'
import { FormLiNotesSchema } from '../prompts/form-li-notes'
import { auditFormLiNotes, auditSynthesisFactsHard } from './form-li-notes-audit'

const compute = {
  summary: { sit: '子', face: '午' },
  patterns: [{ kind: '旺山旺向', name: '旺山旺向' }],
  combinations: [
    { palace: '巽', mountainStar: 2, facingStar: 5, name: '二五交加' },
    { palace: '离', mountainStar: 8, facingStar: 9 },
  ],
}

describe('FormLiNotesSchema', () => {
  test('golden fixture passes Zod', () => {
    const parsed = FormLiNotesSchema.safeParse({
      schemaVersion: 1,
      locale: 'zh',
      bullets: [
        {
          palace: '巽',
          seen: '近处路冲感',
          linkToChart: '对照二五交加',
          severity: 'watch',
        },
      ],
      omittedSignals: ['street_skipped_apartment'],
      inventedFacing: false,
    })
    expect(parsed.success).toBe(true)
  })

  test('inventedFacing must be literal false', () => {
    const parsed = FormLiNotesSchema.safeParse({
      schemaVersion: 1,
      locale: 'zh',
      bullets: [{ palace: '坎', seen: 'a', linkToChart: 'no_chart_link', severity: 'info' }],
      omittedSignals: [],
      inventedFacing: true,
    })
    expect(parsed.success).toBe(false)
  })
})

describe('auditFormLiNotes', () => {
  test('wrong 山N向M must fail', () => {
    const notes = FormLiNotesSchema.parse({
      schemaVersion: 1,
      locale: 'zh',
      bullets: [
        {
          palace: '巽',
          seen: '路冲',
          linkToChart: '山1向3 不符盘面',
          severity: 'risk',
        },
      ],
      omittedSignals: [],
      inventedFacing: false,
    })
    const result = auditFormLiNotes(notes, compute)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.violations.some((v) => v.field === 'shanXiang')).toBe(true)
    }
  })

  test('allowed 山2向5 passes', () => {
    const notes = FormLiNotesSchema.parse({
      schemaVersion: 1,
      locale: 'zh',
      bullets: [
        {
          palace: '巽',
          seen: '路冲',
          linkToChart: '山2向5 二五交加',
          severity: 'watch',
        },
      ],
      omittedSignals: [],
      inventedFacing: false,
    })
    expect(auditFormLiNotes(notes, compute).ok).toBe(true)
  })

  test('medical denylist fails', () => {
    const notes = FormLiNotesSchema.parse({
      schemaVersion: 1,
      locale: 'zh',
      bullets: [
        {
          palace: '巽',
          seen: '形煞',
          linkToChart: '传统重病象',
          severity: 'risk',
        },
      ],
      omittedSignals: [],
      inventedFacing: false,
    })
    const result = auditFormLiNotes(notes, compute)
    expect(result.ok).toBe(false)
  })

  test('overlay claim fails', () => {
    const notes = FormLiNotesSchema.parse({
      schemaVersion: 1,
      locale: 'zh',
      bullets: [
        {
          palace: '坎',
          seen: '图上有箭头指向北',
          linkToChart: 'no_chart_link',
          severity: 'info',
        },
      ],
      omittedSignals: [],
      inventedFacing: false,
    })
    const result = auditFormLiNotes(notes, compute)
    expect(result.ok).toBe(false)
  })
})

describe('auditSynthesisFactsHard', () => {
  test('rejects invented shanXiang in chapter body', () => {
    const result = auditSynthesisFactsHard(
      [
        {
          kind: 'flying_stars',
          title: '飞星',
          goldenLine: '试',
          body: '巽宫山1向3 不合盘',
        },
      ],
      compute
    )
    expect(result.ok).toBe(false)
  })
})
