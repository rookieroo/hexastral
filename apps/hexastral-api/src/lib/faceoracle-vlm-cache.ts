/**
 * FaceOracle / Xingqi VLM extract cache — content-addressed feature rows.
 * Stores hash of image bytes only (never the image). Bump SCHEMA_VERSION
 * when the feature JSON contract or extraction prompt changes.
 */

export const FACEORACLE_VLM_MODEL = 'gemini-3.1-pro-preview'
export const FACEORACLE_VLM_SCHEMA_VERSION = 'xingqi-vlm-v1'

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
 * contentKey material: SHA-256(rawBytes || type || model || schemaVersion)
 * Digests raw image bytes, then mixes type/model/schema into a second digest
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
  const imageDigest = await crypto.subtle.digest('SHA-256', opts.imageBytes)
  const imageHex = hexFromBuffer(imageDigest)
  const keyMaterial = new TextEncoder().encode(
    `${imageHex}|${opts.type}|${model}|${schemaVersion}`
  )
  const keyDigest = await crypto.subtle.digest('SHA-256', keyMaterial)
  return hexFromBuffer(keyDigest)
}
