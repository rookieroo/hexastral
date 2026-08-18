/**
 * AES-256-GCM for Lantai Notion access tokens.
 *
 * Key material: `LANTAI_TOKEN_KEY` Worker secret (any length; SHA-256 → 32 bytes).
 * D1 stores ciphertext + nonce only. Never log plaintext tokens.
 */

function bytesToB64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

async function deriveAesKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function encryptAesGcm(
  plaintext: string,
  secret: string
): Promise<{ ciphertext: string; nonce: string }> {
  const key = await deriveAesKey(secret)
  const nonce = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, encoded)
  return { ciphertext: bytesToB64(new Uint8Array(sealed)), nonce: bytesToB64(nonce) }
}

export async function decryptAesGcm(
  ciphertextB64: string,
  nonceB64: string,
  secret: string
): Promise<string> {
  const key = await deriveAesKey(secret)
  const nonce = b64ToBytes(nonceB64)
  const sealed = b64ToBytes(ciphertextB64)
  const opened = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, sealed)
  return new TextDecoder().decode(opened)
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** First 8 hex chars of sha256(configId) — safe to put in logs. */
export async function configIdLogToken(configId: string): Promise<string> {
  return (await sha256Hex(configId)).slice(0, 8)
}
