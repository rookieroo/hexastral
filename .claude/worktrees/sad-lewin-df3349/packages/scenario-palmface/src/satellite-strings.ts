import type { PalmfaceCaptureStrings } from './types'

const EN: PalmfaceCaptureStrings = {
  title: 'Capture',
  body: 'Use the camera to capture a portrait for a structured reading preview.',
  openCamera: 'Open camera',
  back: '← Back',
  statusIdle: 'No photo yet',
  statusDenied: 'Camera permission denied',
  statusCancelled: 'Cancelled',
  statusWorking: 'Photo captured — generating reading...',
  errorGeneric: 'Preview failed. Please retry.',
}

const ZH: PalmfaceCaptureStrings = {
  title: '拍照',
  body: '使用相机拍摄人像，生成结构化面相预览解读。',
  openCamera: '打开相机',
  back: '← 返回',
  statusIdle: '尚未拍照',
  statusDenied: '未获得相机权限',
  statusCancelled: '已取消',
  statusWorking: '已拍照，正在生成解读…',
  errorGeneric: '预览失败，请重试。',
}

const BY: Record<string, PalmfaceCaptureStrings> = {
  en: EN,
  zh: ZH,
  'zh-Hant': {
    ...ZH,
    title: '拍照',
    body: '使用相機拍攝人像，生成結構化面相預覽解讀。',
    back: '← 返回',
  },
  ja: {
    ...EN,
    title: '撮影',
    body: 'カメラで顔写真を撮り、構造化プレビューを生成します。',
    openCamera: 'カメラを開く',
    back: '← 戻る',
  },
}

export function palmfaceCaptureStringsForLocale(locale: string): PalmfaceCaptureStrings {
  if (BY[locale]) return BY[locale]!
  const base = locale.split('-')[0] ?? 'en'
  return BY[base] ?? EN
}
