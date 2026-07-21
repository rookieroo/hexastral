/**
 * Xingqi VLM feature quality + modality gates (ADR-0028).
 * Reject thin / mismatched extracts before they seed shallow reports.
 * No second interpretation LLM — heuristics only.
 */

import type { FaceoracleFeatureType } from './faceoracle-vlm-cache'

const FACE_CORE_KEYS = [
  'tianTing',
  'yinTang',
  'shanGen',
  'eyebrowType',
  'eyeType',
  'noseShape',
  'cheekBones',
  'chin',
  'complexion',
  'boneStructure',
] as const

const PALM_CORE_KEYS = [
  'handShape',
  'lifeLine',
  'headLine',
  'heartLine',
  'fateLine',
  'mounts',
  'mountJupiter',
  'mountVenus',
] as const

/** Keys that strongly indicate the wrong modality. */
const FACE_ONLY_MARKERS = [
  'tianTing',
  'yinTang',
  'shanGen',
  'nasolabialFolds',
  'earLobes',
  'complexion',
] as const

const PALM_ONLY_MARKERS = [
  'lifeLine',
  'headLine',
  'heartLine',
  'fateLine',
  'mounts',
  'mountJupiter',
  'mountVenus',
  'handShape',
  'fingerRatio',
] as const

const UNCLEAR_RE =
  /^(unclear|n\/?a|unknown|null|none|模糊|不清|无法|無法|看不清|不明显|不明顯|不能判断|不能判斷)\s*$/i

export type FeatureQualityCode = 'photo_quality_low' | 'modality_mismatch'

export type FeatureQualityResult =
  | { ok: true }
  | { ok: false; code: FeatureQualityCode; detail: string }

function asEntries(features: Record<string, string>): Array<[string, string]> {
  return Object.entries(features).filter(
    ([, v]) => typeof v === 'string' && v.trim().length > 0
  )
}

function isUnclear(v: string): boolean {
  const t = v.trim()
  if (t.length < 2) return true
  return UNCLEAR_RE.test(t)
}

function countClear(features: Record<string, string>, keys: readonly string[]): number {
  let n = 0
  for (const k of keys) {
    const v = features[k]
    if (typeof v === 'string' && !isUnclear(v)) n += 1
  }
  return n
}

function markerHits(features: Record<string, string>, markers: readonly string[]): number {
  let n = 0
  for (const k of markers) {
    const v = features[k]
    if (typeof v === 'string' && !isUnclear(v)) n += 1
  }
  return n
}

function isPalmType(type: FaceoracleFeatureType): boolean {
  return type === 'palm' || type === 'palm_l' || type === 'palm_r'
}

/**
 * Assess structured VLM output for Xingqi extract routes.
 */
export function assessFaceoracleFeatureQuality(
  type: FaceoracleFeatureType,
  features: Record<string, string>
): FeatureQualityResult {
  const entries = asEntries(features)
  if (entries.length < 4) {
    return { ok: false, code: 'photo_quality_low', detail: 'too_few_keys' }
  }

  const unclearRatio =
    entries.filter(([, v]) => isUnclear(v)).length / Math.max(entries.length, 1)
  if (unclearRatio >= 0.55) {
    return { ok: false, code: 'photo_quality_low', detail: 'unclear_ratio' }
  }

  if (type === 'face') {
    const palmHits = markerHits(features, PALM_ONLY_MARKERS)
    const blob = entries.map(([, v]) => v).join(' ')
    const palmVocab = /生命线|智慧线|感情线|事业线|金星丘|life\s*line|head\s*line/i.test(blob)
    const faceVocab = /印堂|天庭|山根|准头|地阁|yinTang|tianTing/i.test(blob)
    if (palmHits >= 3 || (palmVocab && !faceVocab)) {
      return {
        ok: false,
        code: 'modality_mismatch',
        detail: palmHits >= 3 ? `face_looks_palm:${palmHits}` : 'face_vocab_palm',
      }
    }
    const clearCore = countClear(features, FACE_CORE_KEYS)
    if (clearCore < 5) {
      return { ok: false, code: 'photo_quality_low', detail: `face_core:${clearCore}` }
    }
    return { ok: true }
  }

  if (isPalmType(type)) {
    const faceHits = markerHits(features, FACE_ONLY_MARKERS)
    const blob = entries.map(([, v]) => v).join(' ')
    const faceVocab = /印堂|天庭|山根|准头|地阁|法令纹/i.test(blob)
    const palmVocab = /生命线|智慧线|感情线|事业线|丘/i.test(blob)
    if (faceHits >= 3 || (faceVocab && !palmVocab)) {
      return {
        ok: false,
        code: 'modality_mismatch',
        detail: faceHits >= 3 ? `palm_looks_face:${faceHits}` : 'palm_vocab_face',
      }
    }
    const clearCore = countClear(features, PALM_CORE_KEYS)
    if (clearCore < 3) {
      return { ok: false, code: 'photo_quality_low', detail: `palm_core:${clearCore}` }
    }
    return { ok: true }
  }

  return { ok: true }
}
