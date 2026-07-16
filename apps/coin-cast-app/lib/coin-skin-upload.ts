import * as FileSystem from 'expo-file-system/legacy'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'react-native'

function customCoinDir(): string | null {
  const root = FileSystem.documentDirectory
  if (!root) return null
  return `${root}coin-skin/`
}

export function getImagePixelSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject)
  })
}

/**
 * Copy picked image into app documents — no crop, original aspect preserved.
 * Always stores as JPEG so expo-three can load the texture (HEIC is unsupported).
 */
export async function pickCustomCoinFaceUri(): Promise<string | null> {
  const dir = customCoinDir()
  if (!dir) {
    throw new Error('documentDirectory unavailable')
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) return null

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.92,
    // Prefer a universally loadable representation (avoids HEIC → GL crash).
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  })
  if (result.canceled || !result.assets[0]?.uri) return null

  const src = result.assets[0].uri
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true })

  const dest = `${dir}obverse-${Date.now()}.jpg`
  await FileSystem.copyAsync({ from: src, to: dest })
  return dest
}

export async function deleteCustomCoinFaceUri(uri: string | undefined): Promise<void> {
  const dir = customCoinDir()
  if (!dir || !uri?.startsWith(dir)) return
  try {
    const info = await FileSystem.getInfoAsync(uri)
    if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true })
  } catch (err) {
    console.warn('[coin-skin-upload] delete failed', err)
  }
}
