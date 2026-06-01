/**
 * Hexastral API typed client (Hono RPC) with HMAC signing.
 *
 * Calls hc<AppType> directly so TypeScript evaluates the route types in this
 * package's context — avoids cross-package type inference breaking the client
 * type to 'unknown'.
 *
 * Usage:
 *   import { apiClient } from '@/lib/api'
 */

import type { AppType } from '@zhop/hexastral-api'
import * as SecureStore from 'expo-secure-store'
import { hc } from 'hono/client'
import { config } from './config'
import { signRequest as hmacSign } from './hmac'

const buildClient = () => {
  const customFetch: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers)

    // user_id stores the actual userId ('apple_xxx', 'guest_xxx') — NOT auth_token which holds the Apple JWT
    const userId = (await SecureStore.getItemAsync('user_id')) ?? ''
    const method = (init?.method ?? 'GET').toUpperCase()
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url
    const path = new URL(url).pathname
    const body =
      init?.body == null
        ? ''
        : typeof init.body === 'string'
          ? init.body
          : JSON.stringify(init.body)

    const sigs = await hmacSign({ body, userId, method, path })
    if (sigs) {
      for (const [k, v] of Object.entries(sigs)) headers.set(k, v)
    }
    if (userId) headers.set('Authorization', `Bearer ${userId}`)

    return fetch(input, { ...init, headers })
  }

  return hc<AppType>(config.apiUrl, { fetch: customFetch })
}

export const apiClient = buildClient()
export type HexastralClient = typeof apiClient
