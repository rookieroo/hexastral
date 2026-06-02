/**
 * Hermes-safe UUID generation.
 *
 * `crypto.randomUUID()` is NOT available in Hermes (React Native JS engine).
 * `expo-crypto` provides a proper CSPRNG-backed implementation that works on device.
 */
import * as ExpoCrypto from 'expo-crypto'

export function randomUUID(): string {
  return ExpoCrypto.randomUUID()
}
