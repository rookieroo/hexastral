import * as FileSystem from 'expo-file-system'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'react-native'

const CUSTOM_COIN_DIR = `${FileSystem.documentDirectory ?? ''}coin-skin/`

export function getImagePixelSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject)
  })
}

/** Copy picked image into app documents — no crop, original aspect preserved. */
export async function pickCustomCoinFaceUri(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) return null

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
  })
  if (result.canceled || !result.assets[0]?.uri) return null

  const src = result.assets[0].uri
  await FileSystem.makeDirectoryAsync(CUSTOM_COIN_DIR, { intermediates: true })

  const extMatch = /\.(\w+)(?:\?|$)/.exec(src)
  const ext = extMatch?.[1]?.toLowerCase() ?? 'jpg'
  const dest = `${CUSTOM_COIN_DIR}obverse-${Date.now()}.${ext}`

  await FileSystem.copyAsync({ from: src, to: dest })
  return dest
}

export async function deleteCustomCoinFaceUri(uri: string | undefined): Promise<void> {
  if (!uri?.startsWith(CUSTOM_COIN_DIR)) return
  try {
    const info = await FileSystem.getInfoAsync(uri)
    if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true })
  } catch (err) {
    console.warn('[coin-skin-upload] delete failed', err)
  }
}
