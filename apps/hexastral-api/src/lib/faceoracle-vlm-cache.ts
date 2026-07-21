/**
 * FaceOracle / Xingqi VLM extract cache — content-addressed feature rows.
 * Stores hash of image bytes only (never the image). Bump SCHEMA_VERSION
 * when the feature JSON contract or extraction prompt changes.
 *
 * Hash uses the cascade id (not the concrete winning model) so Gemini / Kimi /
 * Llama wins for the same pixels share one cache row. The row still records
 * `extractionModel` = which tier actually produced the JSON.
 */

/** Cascade contract id mixed into content-hash (see @zhop/ai-vision VLM_CASCADE_ID). */
export const FACEORACLE_VLM_MODEL = 'vlm-cascade-v1'
// v6: Moondream face point. v7: palm mounts/marks prose. v8: palm landmarks
// dropped (client canonical). v9: palm per-mount + Moondream. v10: palm phrase
// tighten + outlier sanitize + contain-aligned client plotting.
export const FACEORACLE_VLM_SCHEMA_VERSION = 'xingqi-vlm-v10'

export type FaceoracleFeatureType = 'face' | 'palm' | 'palm_l' | 'palm_r'

function hexFromBuffer(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i]!.toString(16).padStart(2, '0')
  }
  return out
}

/** Decode standard / URL-safe base64 to raw bytes. */
export function decodeImageBase64(imageBase64: string): Uint8Array {
  const cleaned = imageBase64.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '')
  const binary = atob(cleaned)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * contentKey material: SHA-256(rawBytes || type || cascadeId || schemaVersion)
 * Digests raw image bytes, then mixes type/cascade/schema into a second digest
 * so the same pixels with a different extract contract never collide.
 */
export async function computeFaceoracleVlmContentHash(opts: {
  imageBytes: Uint8Array
  type: FaceoracleFeatureType
  model?: string
  schemaVersion?: string
}): Promise<string> {
  const model = opts.model ?? FACEORACLE_VLM_MODEL
  const schemaVersion = opts.schemaVersion ?? FACEORACLE_VLM_SCHEMA_VERSION
  // Copy into a fresh ArrayBuffer-backed view: some workspace tsconfigs pin
  // BufferSource to ArrayBuffer and reject the wider Uint8Array<ArrayBufferLike>.
  const bytesForDigest = new Uint8Array(opts.imageBytes.byteLength)
  bytesForDigest.set(opts.imageBytes)
  const imageDigest = await crypto.subtle.digest('SHA-256', bytesForDigest)
  const imageHex = hexFromBuffer(imageDigest)
  const keyMaterial = new TextEncoder().encode(`${imageHex}|${opts.type}|${model}|${schemaVersion}`)
  const keyDigest = await crypto.subtle.digest('SHA-256', keyMaterial)
  return hexFromBuffer(keyDigest)
}
