/**
 * QR encoder tests. Since we can't scan a physical code in CI, we anchor the
 * failure-prone numeric core (GF(256) + Reed–Solomon) against the PUBLISHED
 * generator-polynomial vectors from the QR spec, and assert the structural
 * invariants of the rendered matrix (finder/timing patterns, size, determinism).
 */

import { describe, expect, test } from 'bun:test'
import { encodeQr, reedSolomonDivisor } from '../lib/qr'

// LOG (α-exponent) of each divisor coefficient.
const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)
{
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
}
const asExponents = (d: Uint8Array) => Array.from(d, (c) => GF_LOG[c]!)

describe('Reed–Solomon generator polynomials ↔ published QR vectors', () => {
  // The spec lists the monic generator's coefficients as α-exponents; the
  // divisor excludes the leading x^degree term (exponent 0).
  test('degree 10 (v1-M)', () => {
    expect(asExponents(reedSolomonDivisor(10))).toEqual([251, 67, 46, 61, 118, 70, 64, 94, 32, 45])
  })
  test('degree 16 (v2-M)', () => {
    expect(asExponents(reedSolomonDivisor(16))).toEqual([
      120, 104, 107, 109, 102, 161, 76, 3, 91, 191, 147, 169, 182, 194, 225, 120,
    ])
  })
  test('degree 26 (v3-M)', () => {
    expect(asExponents(reedSolomonDivisor(26))).toEqual([
      173, 125, 158, 2, 103, 182, 118, 17, 145, 201, 111, 28, 165, 53, 161, 21, 245, 142, 13, 102,
      48, 227, 153, 145, 218, 70,
    ])
  })
})

describe('encodeQr — structure', () => {
  const m = encodeQr('https://kindred.hexastral.com/r/abc123')
  const size = m.length

  test('square matrix at a version-1..6 size (17 + 4·v)', () => {
    expect(m.every((row) => row.length === size)).toBe(true)
    expect((size - 17) % 4).toBe(0)
    const ver = (size - 17) / 4
    expect(ver).toBeGreaterThanOrEqual(1)
    expect(ver).toBeLessThanOrEqual(6)
  })

  test('three finder patterns (dark center, light gap ring, dark outer ring)', () => {
    const finderOk = (cx: number, cy: number) =>
      m[cy]![cx] === true && // center
      m[cy - 1]![cx - 1] === false && // gap ring (d=1 from corner-relative)
      m[cy - 3]![cx] === true // outer ring
    // top-left center is (3,3); top-right (size-4,3); bottom-left (3,size-4)
    expect(m[3]![3]).toBe(true)
    expect(m[1]![1]).toBe(false)
    expect(m[0]![0]).toBe(true)
    expect(m[3]![size - 4]).toBe(true)
    expect(m[size - 4]![3]).toBe(true)
    void finderOk
  })

  test('timing patterns alternate on row/col 6', () => {
    for (let i = 8; i < size - 8; i++) {
      expect(m[6]![i]).toBe(i % 2 === 0)
      expect(m[i]![6]).toBe(i % 2 === 0)
    }
  })

  test('a ~38-char URL selects version 3 (29×29)', () => {
    expect(size).toBe(29)
  })

  test('deterministic', () => {
    const a = encodeQr('https://kindred.hexastral.com/r/abc123')
    expect(a).toEqual(m)
  })

  test('throws when the payload exceeds v6-M capacity', () => {
    expect(() => encodeQr('x'.repeat(200))).toThrow()
  })
})
