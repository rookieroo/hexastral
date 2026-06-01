/**
 * HMAC-SHA256 request signing — v2 protocol (matches yuan-app + hexastral-app).
 *
 * Payload: `${userId}.${METHOD}.${path}.${timestamp}.${bodyHash}`
 * Headers attached:
 *   x-client-platform: ios | android
 *   x-hmac-version: 2
 *   x-timestamp: <unix_seconds>
 *   x-body-hash: <hex(SHA-256(body))>
 *   x-signature: <hex(HMAC-SHA256(deviceSecret, payload))>
 *
 * Device secret is provisioned by the server during user creation and stored
 * in SecureStore. See lib/auth.tsx.
 *
 * React Native has no global `crypto.subtle` — HMAC uses expo-crypto (RFC 2104).
 */

import * as Crypto from 'expo-crypto'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const DEVICE_SECRET_KEY = 'feng_device_secret'

export async function storeDeviceSecret(secret: string): Promise<void> {
  await SecureStore.setItemAsync(DEVICE_SECRET_KEY, secret)
}

export async function getDeviceSecret(): Promise<string | null> {
  return SecureStore.getItemAsync(DEVICE_SECRET_KEY)
}

export async function clearDeviceSecret(): Promise<void> {
  await SecureStore.deleteItemAsync(DEVICE_SECRET_KEY)
}

async function sha256Hex(data: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data)
}

async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyBytes = encoder.encode(secret)
  const msgBytes = encoder.encode(message)
  const blockSize = 64

  let keyPadded: Uint8Array
  if (keyBytes.length > blockSize) {
    const hashed = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, keyBytes)
    keyPadded = new Uint8Array(blockSize)
    keyPadded.set(new Uint8Array(hashed))
  } else {
    keyPadded = new Uint8Array(blockSize)
    keyPadded.set(keyBytes)
  }

  const ipadKey = new Uint8Array(blockSize)
  const opadKey = new Uint8Array(blockSize)
  for (let i = 0; i < blockSize; i++) {
    ipadKey[i] = (keyPadded[i] ?? 0) ^ 0x36
    opadKey[i] = (keyPadded[i] ?? 0) ^ 0x5c
  }

  const innerData = new Uint8Array(blockSize + msgBytes.length)
  innerData.set(ipadKey)
  innerData.set(msgBytes, blockSize)
  const innerHash = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, innerData)

  const innerHashBytes = new Uint8Array(innerHash)
  const outerData = new Uint8Array(blockSize + innerHashBytes.length)
  outerData.set(opadKey)
  outerData.set(innerHashBytes, blockSize)
  const outerHash = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, outerData)

  return Array.from(new Uint8Array(outerHash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export interface SignRequestArgs {
  method: string
  path: string
  body: string
  userId: string
}

export async function signRequest({
  method,
  path,
  body,
  userId,
}: SignRequestArgs): Promise<Record<string, string> | null> {
  const secret = await getDeviceSecret()
  if (!secret) return null

  const timestamp = String(Math.floor(Date.now() / 1000))
  const bodyHash = await sha256Hex(body)
  const payload = `${userId}.${method.toUpperCase()}.${path}.${timestamp}.${bodyHash}`
  const signature = await hmacSha256(secret, payload)

  return {
    'x-client-platform': Platform.OS === 'ios' ? 'ios' : 'android',
    'x-hmac-version': '2',
    'x-timestamp': timestamp,
    'x-body-hash': bodyHash,
    'x-signature': signature,
  }
}
