import { runAuto } from '@zhop/portfolio-client'
import * as FileSystem from 'expo-file-system'

import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from './growth-config'

export async function runFacePreview(imageUrl?: string, locale = 'en') {
  let imageBase64: string | undefined
  if (imageUrl?.startsWith('file://')) {
    imageBase64 = await FileSystem.readAsStringAsync(imageUrl, {
      encoding: 'base64',
    })
  }

  return runAuto({
    target: PORTFOLIO_TARGET_APP,
    input: {
      imageUrl: imageUrl && !imageUrl.startsWith('file://') ? imageUrl : undefined,
      imageBase64,
      mode: 'face',
    },
    locale,
    anonymousStoragePrefix: PORTFOLIO_STORAGE_PREFIX,
  })
}
