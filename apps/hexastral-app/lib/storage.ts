/**
 * MMKV storage wrapper — sync, non-blocking, 10x faster than AsyncStorage.
 * Use for non-sensitive persistent data: preferences, cache, query persistence.
 * For secrets (tokens, keys) use expo-secure-store.
 *
 * Falls back to an in-memory store when MMKV is unavailable (Expo Go).
 */

let storage: {
  getString: (key: string) => string | undefined
  set: (key: string, value: string) => void
  remove: (key: string) => void
  getAllKeys: () => string[]
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv')
  storage = createMMKV({ id: 'hexastral' })
} catch {
  // Expo Go / environments without NitroModules — use a plain in-memory map
  const mem = new Map<string, string>()
  storage = {
    getString: (key) => mem.get(key),
    set: (key, value) => {
      mem.set(key, value)
    },
    remove: (key) => {
      mem.delete(key)
    },
    getAllKeys: () => Array.from(mem.keys()),
  }
}

export { storage }

/** Storage adapter compatible with @tanstack/query-sync-storage-persister */
export const mmkvStorage = {
  getItem: (key: string): string | null => storage.getString(key) ?? null,
  setItem: (key: string, value: string): void => storage.set(key, value),
  removeItem: (key: string): void => {
    storage.remove(key)
  },
}
