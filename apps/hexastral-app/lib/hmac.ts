/**
 * HMAC-SHA256 请求签名 — 原生端防伪（iOS + Android）
 *
 * 签名算法 (v2):
 *   1. timestamp = 当前 Unix 秒
 *   2. bodyHash = SHA-256(request body)
 *   3. payload = `${userId}.${METHOD}.${/path}.${timestamp}.${bodyHash}`
 *   4. signature = HMAC-SHA256(deviceSecret, payload)
 *
 * Headers 附加:
 *   x-client-platform: ios | android
 *   x-hmac-version: 2
 *   x-timestamp: <unix_seconds>
 *   x-body-hash: <hex(SHA-256(body))>
 *   x-signature: <hex(HMAC-SHA256(secret, payload))>
 */

import * as Crypto from 'expo-crypto'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const DEVICE_SECRET_KEY = 'device_secret'

/** 存储从服务端下发的 deviceSecret */
export async function storeDeviceSecret(secret: string): Promise<void> {
  await SecureStore.setItemAsync(DEVICE_SECRET_KEY, secret)
}

/** 获取本地存储的 deviceSecret */
export async function getDeviceSecret(): Promise<string | null> {
  return SecureStore.getItemAsync(DEVICE_SECRET_KEY)
}

/** 清除 deviceSecret（登出时调用） */
export async function clearDeviceSecret(): Promise<void> {
  await SecureStore.deleteItemAsync(DEVICE_SECRET_KEY)
}

/** 计算 SHA-256 哈希 (hex) */
async function sha256Hex(data: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data)
}

/** 计算 HMAC-SHA256 签名 (hex) — RFC 2104 构造，使用 expo-crypto digest */
async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyBytes = encoder.encode(secret)
  const msgBytes = encoder.encode(message)
  const blockSize = 64 // SHA-256 block size in bytes

  // If key is longer than block size, hash it first
  // Pass Uint8Array directly — expo-crypto native layer requires a TypedArray, not ArrayBuffer
  let keyPadded: Uint8Array
  if (keyBytes.length > blockSize) {
    const hashed = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, keyBytes)
    keyPadded = new Uint8Array(blockSize)
    keyPadded.set(new Uint8Array(hashed))
  } else {
    keyPadded = new Uint8Array(blockSize)
    keyPadded.set(keyBytes)
  }

  // XOR key with ipad (0x36) and opad (0x5C)
  const ipadKey = new Uint8Array(blockSize)
  const opadKey = new Uint8Array(blockSize)
  for (let i = 0; i < blockSize; i++) {
    ipadKey[i] = (keyPadded[i] ?? 0) ^ 0x36
    opadKey[i] = (keyPadded[i] ?? 0) ^ 0x5c
  }

  // Inner hash: SHA256(ipadKey || message)
  const innerData = new Uint8Array(blockSize + msgBytes.length)
  innerData.set(ipadKey)
  innerData.set(msgBytes, blockSize)
  const innerHash = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, innerData)

  // Outer hash: SHA256(opadKey || innerHash)
  const innerHashBytes = new Uint8Array(innerHash)
  const outerData = new Uint8Array(blockSize + innerHashBytes.length)
  outerData.set(opadKey)
  outerData.set(innerHashBytes, blockSize)
  const outerHash = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, outerData)

  return Array.from(new Uint8Array(outerHash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export interface SignatureHeaders {
  [key: string]: string
  'x-client-platform': 'ios' | 'android'
  'x-hmac-version': '2'
  'x-timestamp': string
  'x-body-hash': string
  'x-signature': string
}

export interface SignRequestParams {
  body: string
  userId: string
  method: string
  path: string
}

/**
 * 为请求生成签名 Headers (v2)
 *
 * @param params.body - 请求体字符串 (JSON.stringify 后的值)
 * @param params.userId - 当前认证用户 ID
 * @param params.method - HTTP 方法 (GET, POST, etc.)
 * @param params.path - URL pathname (e.g. /api/natal/chart)
 * @returns 签名 Headers, 或 null 如果 deviceSecret 未配置
 */
export async function signRequest(params: SignRequestParams): Promise<SignatureHeaders | null> {
  const deviceSecret = await getDeviceSecret()
  if (!deviceSecret) return null

  const { body, userId, method, path } = params
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const bodyHash = await sha256Hex(body)
  const payload = `${userId}.${method.toUpperCase()}.${path}.${timestamp}.${bodyHash}`
  const signature = await hmacSha256(deviceSecret, payload)

  return {
    'x-client-platform': Platform.OS === 'android' ? 'android' : 'ios',
    'x-hmac-version': '2',
    'x-timestamp': timestamp,
    'x-body-hash': bodyHash,
    'x-signature': signature,
  }
}
