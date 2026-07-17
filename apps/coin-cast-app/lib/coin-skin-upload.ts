import * as FileSystem from 'expo-file-system/legacy'
import type { ActionResize } from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'react-native'

import { MAX_COIN_TEXTURE_DIMENSION, normalizedCoinImageSize } from '@/lib/coin-skin-normalization'

export type CoinSkinUploadErrorCode =
  | 'permission_denied'
  | 'native_module_unavailable'
  | 'unsupported_image'
  | 'storage_unavailable'
  | 'storage_failed'

export class CoinSkinUploadError extends Error {
  constructor(
    readonly code: CoinSkinUploadErrorCode,
    message: string,
    readonly canOpenSettings = false
  ) {
    super(message)
    this.name = 'CoinSkinUploadError'
  }
}

export type CoinSkinPickResult =
  | { status: 'cancelled' }
  | { status: 'selected'; uri: string; width: number; height: number }

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

function resizeAction(width: number, height: number): ActionResize | undefined {
  if (Math.max(width, height) <= MAX_COIN_TEXTURE_DIMENSION) return undefined
  const normalized = normalizedCoinImageSize(width, height)
  return {
    resize: {
      width: normalized.width,
      height: normalized.height,
    },
  }
}

async function ensurePhotoPermission(): Promise<void> {
  let permission: ImagePicker.MediaLibraryPermissionResponse
  try {
    permission = await ImagePicker.getMediaLibraryPermissionsAsync()
    if (!permission.granted && permission.canAskAgain) {
      permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    }
  } catch (err) {
    console.warn('[coin-skin-upload] photo permission module failed', err)
    throw new CoinSkinUploadError(
      'native_module_unavailable',
      'Photo library native module is unavailable'
    )
  }
  if (!permission.granted) {
    throw new CoinSkinUploadError(
      'permission_denied',
      'Photo library permission was denied',
      !permission.canAskAgain
    )
  }
}

async function normalizeImage(sourceUri: string, width: number, height: number): Promise<string> {
  const resize = resizeAction(width, height)
  let ImageManipulator: typeof import('expo-image-manipulator')
  try {
    ImageManipulator = await import('expo-image-manipulator')
  } catch (err) {
    console.warn('[coin-skin-upload] image manipulator module failed', err)
    throw new CoinSkinUploadError(
      'native_module_unavailable',
      'Image processing native module is unavailable'
    )
  }
  try {
    const result = await ImageManipulator.manipulateAsync(sourceUri, resize ? [resize] : [], {
      compress: 0.92,
      format: ImageManipulator.SaveFormat.JPEG,
    })
    return result.uri
  } catch (err) {
    console.warn('[coin-skin-upload] image normalization failed', err)
    throw new CoinSkinUploadError('unsupported_image', 'The selected image could not be decoded')
  }
}

/**
 * Normalize a picked image into app documents without cropping.
 * The returned file is fully validated before callers persist its URI.
 */
export async function pickCustomCoinFaceUri(): Promise<CoinSkinPickResult> {
  const dir = customCoinDir()
  if (!dir) {
    throw new CoinSkinUploadError('storage_unavailable', 'Document storage is unavailable')
  }

  await ensurePhotoPermission()

  let result: ImagePicker.ImagePickerResult
  try {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    })
  } catch (err) {
    console.warn('[coin-skin-upload] image picker failed', err)
    throw new CoinSkinUploadError(
      'native_module_unavailable',
      'Photo picker native module is unavailable'
    )
  }
  if (result.canceled) return { status: 'cancelled' }

  const asset = result.assets[0]
  if (!asset?.uri || !asset.width || !asset.height || asset.width <= 0 || asset.height <= 0) {
    throw new CoinSkinUploadError('unsupported_image', 'The selected image has invalid dimensions')
  }

  const normalizedUri = await normalizeImage(asset.uri, asset.width, asset.height)
  const id = `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`
  const staging = `${dir}.obverse-${id}.tmp.jpg`
  const destination = `${dir}obverse-${id}.jpg`

  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true })
    await FileSystem.copyAsync({ from: normalizedUri, to: staging })
    const info = await FileSystem.getInfoAsync(staging)
    if (!info.exists || !info.size || info.size <= 0) {
      throw new Error('Normalized image file is empty')
    }
    const dimensions = await getImagePixelSize(staging)
    if (dimensions.width <= 0 || dimensions.height <= 0) {
      throw new Error('Normalized image dimensions are invalid')
    }
    await FileSystem.moveAsync({ from: staging, to: destination })
    return {
      status: 'selected',
      uri: destination,
      width: dimensions.width,
      height: dimensions.height,
    }
  } catch (err) {
    console.warn('[coin-skin-upload] persistence failed', err)
    await FileSystem.deleteAsync(staging, { idempotent: true }).catch((cleanupError) => {
      console.warn('[coin-skin-upload] staging cleanup failed', cleanupError)
    })
    throw new CoinSkinUploadError('storage_failed', 'The normalized image could not be saved')
  }
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
