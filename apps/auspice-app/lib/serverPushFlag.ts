/**
 * Tiny shared flag: is this device registered for Auspice SERVER push?
 *
 * Split out from lib/serverPush so lib/push (the local scheduler) can read it
 * without importing the registration code (which pulls expo-notifications +
 * network). When true, the local DAILY scheduler defers — the server owns the
 * daily push, so we don't double-notify.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const ACTIVE_KEY = 'auspice.serverPush.active'

export async function isServerPushActive(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ACTIVE_KEY)) === '1'
  } catch {
    return false
  }
}

export async function setServerPushActive(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ACTIVE_KEY, on ? '1' : '0')
  } catch {}
}
