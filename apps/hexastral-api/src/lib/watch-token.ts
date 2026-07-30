/**
 * Yuun Watch bearer token helpers — `w1.<credentialId>.<secret>`.
 * Plaintext secret is returned once at mint time; only SHA-256 hex is stored.
 */

const WATCH_TOKEN_PREFIX = 'w1'

/** Compute SHA-256 hex digest of a UTF-8 string. */
export async function sha256Hex(data: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Constant-time string compare for fixed-length hex digests. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function bytesToBase64url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Generate a 32-byte random secret encoded as base64url (no padding). */
export function generateWatchSecret(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return bytesToBase64url(bytes)
}

export interface ParsedWatchToken {
  credentialId: string
  secret: string
}

/** Parse `w1.<id>.<secret>` from a Bearer authorization header value. */
export function parseWatchBearerToken(authHeader: string | undefined): ParsedWatchToken | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  const raw = authHeader.slice('Bearer '.length).trim()
  const parts = raw.split('.')
  if (parts.length !== 3) return null
  const [prefix, credentialId, secret] = parts
  if (prefix !== WATCH_TOKEN_PREFIX || !credentialId || !secret) return null
  return { credentialId, secret }
}

/** Build the one-time bearer token returned to the client at credential creation. */
export function formatWatchToken(credentialId: string, secret: string): string {
  return `${WATCH_TOKEN_PREFIX}.${credentialId}.${secret}`
}
