/**
 * Pythagorean numerology — deterministic computation library (Phase D.2).
 *
 * Numerology is fully deterministic: Life-Path / Birthday / Expression /
 * Soul-Urge / Personality numbers are sums-of-digits (or sums-of-letters)
 * reduced to a single digit, with master numbers 11, 22, 33 preserved.
 * No LLM is required for v1.0 — AI-augmented narration is reserved for v1.5.
 *
 * Reference rules:
 *   - Master numbers (11, 22, 33) are NOT reduced.
 *   - Life-Path: sum the digits of the birthdate.
 *   - Expression: sum the letter values of the full name (per Pythagorean grid).
 *   - Soul-Urge:   sum vowels only.
 *   - Personality: sum consonants only.
 *   - Birthday:    the day-of-month (reduced; master preserved).
 *   - Personal-Year: sum birth month + birth day + given calendar year.
 *
 * The Pythagorean grid (1–9, A=1, B=2, … Z=8):
 *   1  2  3  4  5  6  7  8  9
 *   A  B  C  D  E  F  G  H  I
 *   J  K  L  M  N  O  P  Q  R
 *   S  T  U  V  W  X  Y  Z
 */

const PYTHAGOREAN: Record<string, number> = {
  A: 1, J: 1, S: 1,
  B: 2, K: 2, T: 2,
  C: 3, L: 3, U: 3,
  D: 4, M: 4, V: 4,
  E: 5, N: 5, W: 5,
  F: 6, O: 6, X: 6,
  G: 7, P: 7, Y: 7,
  H: 8, Q: 8, Z: 8,
  I: 9, R: 9,
}

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U'])
// Y is a contextual vowel — for v1.0 we treat it as a consonant (most common
// modern convention); a future flag can switch to "always vowel" if a culture
// preset asks for it.

/** Reduce to a single digit, preserving master numbers 11, 22, 33. */
export function reduceNumber(n: number): number {
  if (n === 11 || n === 22 || n === 33) return n
  if (n < 10) return n
  let cur = n
  while (cur > 9 && cur !== 11 && cur !== 22 && cur !== 33) {
    let next = 0
    let x = cur
    while (x > 0) {
      next += x % 10
      x = Math.floor(x / 10)
    }
    cur = next
  }
  return cur
}

function digitsOf(n: number): number[] {
  const out: number[] = []
  let x = Math.abs(Math.floor(n))
  if (x === 0) return [0]
  while (x > 0) {
    out.push(x % 10)
    x = Math.floor(x / 10)
  }
  return out.reverse()
}

/**
 * Life-Path number: sum of the digits of the entire birthdate, reduced.
 * Pythagorean tradition reduces month, day, year independently then sums —
 * we use the equivalent flat-sum approach (mathematically identical when no
 * master numbers appear in the components, and the modern American school
 * accepts the flat sum for simplicity).
 */
export function lifePath(birthDateIso: string): number {
  const [y, m, d] = birthDateIso.split('-').map((s) => Number.parseInt(s, 10))
  if (!y || !m || !d) {
    throw new Error(`numerology.lifePath: invalid date ${birthDateIso}`)
  }
  const sum = digitsOf(y).reduce((a, b) => a + b, 0) +
    digitsOf(m).reduce((a, b) => a + b, 0) +
    digitsOf(d).reduce((a, b) => a + b, 0)
  return reduceNumber(sum)
}

/** Birthday number: day of birth, reduced (preserves master 11/22). */
export function birthdayNumber(birthDateIso: string): number {
  const day = Number.parseInt(birthDateIso.split('-')[2] ?? '0', 10)
  if (!day) throw new Error(`numerology.birthdayNumber: invalid date ${birthDateIso}`)
  return reduceNumber(day)
}

function lettersOf(name: string, predicate: (ch: string) => boolean): number[] {
  const upper = name.toUpperCase()
  const out: number[] = []
  for (const ch of upper) {
    if (!/[A-Z]/.test(ch)) continue
    if (!predicate(ch)) continue
    const v = PYTHAGOREAN[ch]
    if (v != null) out.push(v)
  }
  return out
}

/** Expression number: sum of all letter values of the full name. */
export function expressionNumber(fullName: string): number {
  const sum = lettersOf(fullName, () => true).reduce((a, b) => a + b, 0)
  return reduceNumber(sum)
}

/** Soul-Urge number: sum of vowel values of the full name. */
export function soulUrgeNumber(fullName: string): number {
  const sum = lettersOf(fullName, (ch) => VOWELS.has(ch)).reduce((a, b) => a + b, 0)
  return reduceNumber(sum)
}

/** Personality number: sum of consonant values of the full name. */
export function personalityNumber(fullName: string): number {
  const sum = lettersOf(fullName, (ch) => !VOWELS.has(ch)).reduce((a, b) => a + b, 0)
  return reduceNumber(sum)
}

/**
 * Personal-Year number for a given calendar year: sum birth-month + birth-day
 * + the year, reduced. Captures the "vibe" of a specific year for the person.
 */
export function personalYearNumber(birthDateIso: string, calendarYear: number): number {
  const [, m, d] = birthDateIso.split('-').map((s) => Number.parseInt(s, 10))
  if (!m || !d) throw new Error(`numerology.personalYearNumber: invalid date ${birthDateIso}`)
  const sum =
    digitsOf(m).reduce((a, b) => a + b, 0) +
    digitsOf(d).reduce((a, b) => a + b, 0) +
    digitsOf(calendarYear).reduce((a, b) => a + b, 0)
  return reduceNumber(sum)
}

export interface NumerologyReading {
  fullName: string
  birthDate: string
  lifePath: number
  birthday: number
  expression: number
  soulUrge: number
  personality: number
  personalYear: number
  /** For audit / regeneration determinism. */
  computedAt: string
}

export function computeNumerologyReading(input: {
  fullName: string
  birthDate: string
  /** Defaults to the current calendar year in UTC. */
  calendarYear?: number
}): NumerologyReading {
  const year = input.calendarYear ?? new Date().getUTCFullYear()
  return {
    fullName: input.fullName.trim(),
    birthDate: input.birthDate,
    lifePath: lifePath(input.birthDate),
    birthday: birthdayNumber(input.birthDate),
    expression: expressionNumber(input.fullName),
    soulUrge: soulUrgeNumber(input.fullName),
    personality: personalityNumber(input.fullName),
    personalYear: personalYearNumber(input.birthDate, year),
    computedAt: new Date().toISOString(),
  }
}
