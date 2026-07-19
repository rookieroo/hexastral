/**
 * FaceOracle job feature-triple helpers — shared by enqueue dedupe / 409 paths.
 */

export type FaceoracleFeatureTriple = {
  faceFeatureId: string
  palmLeftFeatureId: string
  palmRightFeatureId: string
}

export function sameFaceoracleFeatures(
  a: FaceoracleFeatureTriple,
  b: FaceoracleFeatureTriple
): boolean {
  return (
    a.faceFeatureId === b.faceFeatureId &&
    a.palmLeftFeatureId === b.palmLeftFeatureId &&
    a.palmRightFeatureId === b.palmRightFeatureId
  )
}

export function parseReadingFeatureIds(inputJson: string): FaceoracleFeatureTriple | null {
  try {
    const raw: unknown = JSON.parse(inputJson)
    if (!raw || typeof raw !== 'object') return null
    const o = raw as Record<string, unknown>
    const face = typeof o.faceFeatureId === 'string' ? o.faceFeatureId : null
    const left = typeof o.palmLeftFeatureId === 'string' ? o.palmLeftFeatureId : null
    const right = typeof o.palmRightFeatureId === 'string' ? o.palmRightFeatureId : null
    if (!face || !left || !right) return null
    return { faceFeatureId: face, palmLeftFeatureId: left, palmRightFeatureId: right }
  } catch {
    return null
  }
}

/** Stable API body for 409 features_unchanged. */
export function featuresUnchangedPayload(readingId: string | null | undefined): {
  error: 'features_unchanged'
  code: 'features_unchanged'
  message: string
  readingId: string | null
} {
  return {
    error: 'features_unchanged',
    code: 'features_unchanged',
    message: 'Update at least one photo before starting a new reading',
    readingId: readingId ?? null,
  }
}
