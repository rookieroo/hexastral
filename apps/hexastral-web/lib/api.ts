/**
 * HexAstral API client — for hexastral-web (Next.js)
 *
 * Used for public routes that don't require HMAC signing.
 * HMAC-signed routes belong to the iOS app only.
 */

import { createHexastralClient } from '@zhop/hexastral-client'

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.hexastral.com'

export const api = createHexastralClient(baseUrl, {})
