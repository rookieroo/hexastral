/**
 * Default copy for `<CapturePipeline>` in en / zh / zh-Hant / ja.
 *
 * Subject-agnostic — talks about "the subject" instead of face/palm/floor
 * plan/handwriting. Callers should usually override `title`, `body`, and
 * `qualityFraming` with subject-specific wording while keeping the privacy
 * disclaimer + quality bullets verbatim so users see the same promise on
 * every flow.
 */

import type { CapturePipelineStrings } from './CapturePipeline'

const EN: CapturePipelineStrings = {
  title: 'Capture',
  body: 'Use the camera to capture a photo for AI analysis.',
  openCamera: 'Open camera',
  back: '← Back',
  statusIdle: 'No photo yet',
  statusDenied: 'Camera permission denied',
  statusCancelled: 'Cancelled',
  statusWorking: 'Photo captured — generating reading…',
  errorGeneric: 'Preview failed. Please retry.',
  qualityTitle: 'For a usable reading',
  qualityFocus: 'Sharp focus — subject clearly visible, no motion blur',
  qualityLight: 'Even, natural light — no harsh shadows across the subject',
  qualityFraming: 'Subject centered and head-on, fills the frame',
  aiDisclaimer:
    'Your photo is sent to a third-party AI vision model for one-time analysis and is not stored after the reading is generated.',
}

const ZH: CapturePipelineStrings = {
  title: '拍照',
  body: '使用相机拍照，生成 AI 解读。',
  openCamera: '打开相机',
  back: '← 返回',
  statusIdle: '尚未拍照',
  statusDenied: '未获得相机权限',
  statusCancelled: '已取消',
  statusWorking: '已拍照，正在生成解读…',
  errorGeneric: '预览失败，请重试。',
  qualityTitle: '为了准确解读，请确保',
  qualityFocus: '画面清晰对焦——主体清楚可见，无抖动模糊',
  qualityLight: '光线均匀自然——主体上无明显阴影遮挡',
  qualityFraming: '居中正对镜头——主体充满画面',
  aiDisclaimer:
    '您的照片会一次性发送至第三方 AI 视觉模型进行分析，生成解读后即刻销毁，不会被保存。',
}

const ZH_HANT: CapturePipelineStrings = {
  ...ZH,
  title: '拍照',
  body: '使用相機拍照，生成 AI 解讀。',
  back: '← 返回',
  qualityTitle: '為了準確解讀，請確保',
  qualityFocus: '畫面清晰對焦——主體清楚可見，無抖動模糊',
  qualityLight: '光線均勻自然——主體上無明顯陰影遮擋',
  qualityFraming: '居中正對鏡頭——主體充滿畫面',
  aiDisclaimer:
    '您的照片會一次性發送至第三方 AI 視覺模型進行分析，生成解讀後即刻銷毀，不會被保存。',
}

const JA: CapturePipelineStrings = {
  ...EN,
  title: '撮影',
  body: 'カメラで写真を撮り、AI 解析を生成します。',
  openCamera: 'カメラを開く',
  back: '← 戻る',
  qualityTitle: '正確な鑑定のために',
  qualityFocus: 'ピントがはっきり——被写体のディテールが鮮明、ブレなし',
  qualityLight: '自然で均一な光——被写体に強い影がない',
  qualityFraming: '被写体は中央で正面向き、画面いっぱい',
  aiDisclaimer:
    'お撮りいただいた画像は、解析のために一度だけ外部 AI ビジョンモデルへ送信され、鑑定生成後は保存されません。',
}

const BY: Record<string, CapturePipelineStrings> = {
  en: EN,
  zh: ZH,
  'zh-Hant': ZH_HANT,
  ja: JA,
}

export function captureCopyForLocale(locale: string): CapturePipelineStrings {
  const exact = BY[locale]
  if (exact) return exact
  const base = locale.split('-')[0] ?? 'en'
  return BY[base] ?? EN
}
