import * as FileSystem from 'expo-file-system'

import { config } from './config'

export type FacePortfolioPreview = {
  readingId: string
  output: Record<string, unknown>
}

export async function runFacePortfolioPreview(opts: {
  imageUri?: string
  locale: string
  mode: 'face' | 'palm'
}): Promise<FacePortfolioPreview> {
  let imageBase64: string | undefined
  if (opts.imageUri?.startsWith('file://')) {
    imageBase64 = await FileSystem.readAsStringAsync(opts.imageUri, {
      encoding: 'base64',
    })
  }

  const url = `${config.apiUrl.replace(/\/+$/, '')}/api/portfolio/preview/faceoracle`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-platform': 'ios',
    },
    body: JSON.stringify({
      input: {
        imageBase64,
        mode: opts.mode,
      },
      locale: opts.locale,
    }),
  })
  if (!res.ok) {
    throw new Error(`Face preview failed: ${res.status}`)
  }
  const json = (await res.json()) as { readingId?: string; output?: Record<string, unknown> }
  if (typeof json.readingId !== 'string') {
    throw new Error('Face preview: missing readingId')
  }
  return {
    readingId: json.readingId,
    output: typeof json.output === 'object' && json.output !== null ? json.output : {},
  }
}
