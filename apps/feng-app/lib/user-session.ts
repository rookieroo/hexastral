import * as SecureStore from 'expo-secure-store'
import { clearDeviceSecret } from './hmac'

export const FENG_USER_ID_KEY = 'feng_user_id'
const AUTH_TOKEN_KEY = 'feng_auth_token'

export async function getStoredFengUserId(): Promise<string | null> {
  return SecureStore.getItemAsync(FENG_USER_ID_KEY)
}

export async function setStoredFengUserId(userId: string): Promise<void> {
  await SecureStore.setItemAsync(FENG_USER_ID_KEY, userId)
}

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token)
}

export async function clearFengUserSession(): Promise<void> {
  await SecureStore.deleteItemAsync(FENG_USER_ID_KEY)
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY)
  await clearDeviceSecret()
}
