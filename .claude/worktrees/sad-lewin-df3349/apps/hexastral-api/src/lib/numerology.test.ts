import { describe, expect, it } from 'bun:test'
import {
  birthdayNumber,
  computeNumerologyReading,
  expressionNumber,
  lifePath,
  personalityNumber,
  personalYearNumber,
  reduceNumber,
  soulUrgeNumber,
} from './numerology'

describe('numerology', () => {
  describe('reduceNumber', () => {
    it('returns single-digit input unchanged', () => {
      for (let i = 0; i < 10; i++) expect(reduceNumber(i)).toBe(i)
    })
    it('preserves master numbers 11, 22, 33', () => {
      expect(reduceNumber(11)).toBe(11)
      expect(reduceNumber(22)).toBe(22)
      expect(reduceNumber(33)).toBe(33)
    })
    it('reduces non-master multi-digit numbers', () => {
      expect(reduceNumber(12)).toBe(3) // 1+2 = 3
      expect(reduceNumber(48)).toBe(3) // 4+8=12 → 1+2=3
    })
    it('preserves master numbers reached during reduction', () => {
      // 38 → 3+8 = 11 (master) — should stop at 11, not reduce further
      expect(reduceNumber(38)).toBe(11)
      // 49 → 4+9 = 13 → 1+3 = 4 (no master encountered)
      expect(reduceNumber(49)).toBe(4)
    })
  })

  describe('lifePath', () => {
    it('Steve Jobs (1955-02-24) → 1+9+5+5+2+2+4 = 28 → 10 → 1', () => {
      expect(lifePath('1955-02-24')).toBe(1)
    })
    it('Albert Einstein (1879-03-14) → 1+8+7+9+3+1+4 = 33 → master', () => {
      expect(lifePath('1879-03-14')).toBe(33)
    })
    it('throws on invalid date', () => {
      expect(() => lifePath('not-a-date')).toThrow()
    })
  })

  describe('expressionNumber', () => {
    it('respects Pythagorean grid', () => {
      // "AAA" -> 1+1+1 = 3
      expect(expressionNumber('AAA')).toBe(3)
      // "ABC" -> 1+2+3 = 6
      expect(expressionNumber('ABC')).toBe(6)
    })
    it('ignores non-letter characters and is case-insensitive', () => {
      expect(expressionNumber('  abc!? ')).toBe(6)
      expect(expressionNumber('a-b-c')).toBe(6)
    })
  })

  describe('soulUrgeNumber & personalityNumber', () => {
    it('split vowels and consonants', () => {
      // "ABE" -> vowels A(1)+E(5)=6 ; consonant B(2)
      expect(soulUrgeNumber('ABE')).toBe(6)
      expect(personalityNumber('ABE')).toBe(2)
    })
  })

  describe('birthdayNumber', () => {
    it('returns reduced day-of-month', () => {
      expect(birthdayNumber('1990-06-15')).toBe(6) // 1+5
      expect(birthdayNumber('1990-06-22')).toBe(22) // master preserved
    })
  })

  describe('personalYearNumber', () => {
    it('combines birth m+d with the calendar year', () => {
      // 1990-06-15 in 2026: 6+1+5+2+0+2+6 = 22 → master
      expect(personalYearNumber('1990-06-15', 2026)).toBe(22)
    })
  })

  describe('computeNumerologyReading', () => {
    it('returns the full panel deterministically', () => {
      const r = computeNumerologyReading({
        fullName: 'Albert Einstein',
        birthDate: '1879-03-14',
        calendarYear: 2026,
      })
      expect(r.lifePath).toBe(33)
      expect(r.birthday).toBe(5) // 14 → 5
      expect(typeof r.expression).toBe('number')
      expect(typeof r.soulUrge).toBe('number')
      expect(typeof r.personality).toBe('number')
      expect(typeof r.personalYear).toBe('number')
      expect(r.computedAt).toMatch(/T/)
    })
  })
})
