/**
 * 面相/手相 Physiognomy Service — structured VLM feature extraction (ADR-0028).
 *
 * Face: Kimi/Gemini/Llama feature text + Moondream `point` coordinates.
 * Palm: per-line/mount feature text + VLM midpoints, Moondream `point` wins
 * (same pointing path as face). Clustered midpoints are dropped before merge.
 */

import {
  callVisionStructuredWithFallback,
  extractLandmarksViaMoondream,
  type LandmarkPoint,
} from '@zhop/ai-vision'
import type { Env } from '../types'

/**
 * 面相特征 Schema — Xingqi canonical face stack (三停·五岳·局部宫位线索)
 * VLM 提取后存入 D1；字段中文语义如下，供后续 LLM 合参。
 * 天庭/印堂≈命宫·官禄一带；准头≈财帛；地阁≈收束；颧骨≈五岳西东岳。
 */
export interface FaceFeatures {
  /** 天庭 — 额头上部 / 上停 */
  tianTing: string
  /** 印堂 — 两眉间 / 命宫一带 */
  yinTang: string
  /** 山根 — 鼻梁根 */
  shanGen: string
  /** 额头宽度 — 上停横向格局 */
  foreheadWidth: string
  /** 眉型 */
  eyebrowType: string
  /** 眼型神采 */
  eyeType: string
  /** 鼻型（年寿+准头；鼻为中岳） */
  noseShape: string
  /** 颧骨 — 五岳 */
  cheekBones: string
  /** 法令纹 */
  nasolabialFolds: string
  /** 嘴型 */
  mouthType: string
  /** 地阁 — 下巴 */
  chin: string
  /** 耳垂 */
  earLobes: string
  /** 气色 */
  complexion: string
  /** 骨相 */
  boneStructure: string
  /** 面相整体简评（3句内） */
  overallAssessment: string
}

const LANDMARK_POINT_SCHEMA = {
  type: 'object',
  properties: {
    x: { type: 'number' },
    y: { type: 'number' },
  },
  required: ['x', 'y'],
}

const FACE_LANDMARK_KEYS = [
  'tianTing',
  'yinTang',
  'shanGen',
  'foreheadWidth',
  'eyebrowType',
  'eyeType',
  'noseShape',
  'cheekBones',
  'nasolabialFolds',
  'mouthType',
  'chin',
  'earLobes',
] as const

function landmarkProperties(keys: readonly string[]): Record<string, unknown> {
  const props: Record<string, unknown> = {}
  for (const k of keys) {
    props[k] = LANDMARK_POINT_SCHEMA
  }
  return props
}

/**
 * English anatomical phrases fed to Moondream `point` per locus key. Kept in
 * English because Moondream's grounding is English-first; keys map back to the
 * Chinese canon downstream.
 */
const FACE_POINT_PHRASES: Record<(typeof FACE_LANDMARK_KEYS)[number], string> = {
  tianTing: 'the center of the upper forehead',
  yinTang: 'the point between the eyebrows (glabella)',
  shanGen: 'the root of the nose between the eyes',
  foreheadWidth: 'the side edge of the forehead near the temple',
  eyebrowType: 'the eyebrow',
  eyeType: 'the eye',
  noseShape: 'the tip of the nose',
  cheekBones: 'the cheekbone',
  nasolabialFolds: 'the smile line beside the nose and mouth',
  mouthType: 'the mouth',
  chin: 'the chin',
  earLobes: 'the earlobe',
}

/** Merge Moondream points over VLM-emitted landmarks (Moondream wins per key). */
function mergeLandmarks<K extends string>(
  vlmLandmarks: Partial<Record<K, LandmarkPoint>>,
  moondream: Record<string, LandmarkPoint>
): Partial<Record<K, LandmarkPoint>> {
  const out: Partial<Record<K, LandmarkPoint>> = { ...vlmLandmarks }
  for (const [key, pt] of Object.entries(moondream)) {
    out[key as K] = pt
  }
  return out
}

const FACE_FEATURES_SYSTEM_PROMPT = `你是一位精通中国传统面相学的专家（框架：三停·五岳·十二宫线索·五官·气色骨肉），同时具备计算机视觉分析能力。
请仔细观察图片中的面部特征，按下列字段提取结构化描述。

重要说明：
- 按照要求的 JSON Schema 精确输出，不得增删字段
- features 下每个字段给出简短的中文描述（5-15字），尽量使用：天庭、印堂、山根、年寿、准头、地阁、颧骨、法令纹、气色、骨相等术语
- landmarks 下为各部位在图片中的归一化坐标 (x,y)，范围 0.0–1.0，原点在图片左上角
- 刘海/眼镜遮挡时：仍按解剖位置估计坐标（发际下天庭中点、印堂两眉间、山根鼻梁根等），不要把点标在刘海外缘或省略
- 优先给出 tianTing / yinTang / shanGen / eyeType / noseShape / mouthType / chin 的 landmarks；仅完全不可见时才省略
- complexion / boneStructure / overallAssessment 不需要 landmarks
- 如某部位在图片中不清晰，features 标注值为 "unclear"，landmarks 可省略该 key
- 绝对不要包含对用户外貌的主观美丑评价
- 不要做命运断语，只描述可见形气特征`

const FACE_FEATURES_SCHEMA = {
  type: 'object',
  properties: {
    features: {
      type: 'object',
      properties: {
        tianTing: { type: 'string' },
        yinTang: { type: 'string' },
        shanGen: { type: 'string' },
        foreheadWidth: { type: 'string' },
        eyebrowType: { type: 'string' },
        eyeType: { type: 'string' },
        noseShape: { type: 'string' },
        cheekBones: { type: 'string' },
        nasolabialFolds: { type: 'string' },
        mouthType: { type: 'string' },
        chin: { type: 'string' },
        earLobes: { type: 'string' },
        complexion: { type: 'string' },
        boneStructure: { type: 'string' },
        overallAssessment: { type: 'string' },
      },
      required: [
        'tianTing',
        'yinTang',
        'shanGen',
        'foreheadWidth',
        'eyebrowType',
        'eyeType',
        'noseShape',
        'cheekBones',
        'nasolabialFolds',
        'mouthType',
        'chin',
        'earLobes',
        'complexion',
        'boneStructure',
        'overallAssessment',
      ],
    },
    landmarks: {
      type: 'object',
      properties: landmarkProperties(FACE_LANDMARK_KEYS),
    },
  },
  required: ['features', 'landmarks'],
}

export type FaceLandmarks = Partial<
  Record<(typeof FACE_LANDMARK_KEYS)[number], { x: number; y: number }>
>

type FaceExtractPayload = { features: FaceFeatures; landmarks: FaceLandmarks }

/**
 * 面相特征结构化提取 — Kimi CF vision 首选，Gemini / Llama 兜底。
 * 不存原图，只存特征向量（ADR-0028）。
 */
export async function extractFaceFeatures(
  env: Env,
  imageBase64: string,
  mimeType = 'image/jpeg'
): Promise<{ features: FaceFeatures; landmarks: FaceLandmarks; model: string }> {
  const result = await callVisionStructuredWithFallback<FaceExtractPayload>(
    { AI: env.AI, GEMINI_API_KEY: env.GEMINI_API_KEY },
    {
      systemPrompt: FACE_FEATURES_SYSTEM_PROMPT,
      userPrompt: '请按要求提取面相特征与 landmarks，只输出 JSON，不要任何额外文字。',
      images: [{ base64: imageBase64, mimeType }],
      responseSchema: FACE_FEATURES_SCHEMA as Record<string, unknown>,
      temperature: 0.2,
      maxOutputTokens: 1536,
      geminiThinkingLevel: 'MINIMAL',
      metricLabel: 'physiognomy_face_extract',
    }
  )
  const moondream = await extractLandmarksViaMoondream(
    env.AI,
    { base64: imageBase64, mimeType },
    FACE_POINT_PHRASES
  )
  return {
    features: result.data.features,
    landmarks: mergeLandmarks(result.data.landmarks ?? {}, moondream),
    model: result.model,
  }
}

/** Structured palm features — Xingqi canonical palm stack (主纹 + 分项丘位). */
export interface PalmFeatures {
  /** 掌形（可含地/火/风/水型等可见外形） */
  handShape: string
  /** 生命线 */
  lifeLine: string
  /** 智慧线 / 头脑线 */
  headLine: string
  /** 感情线 / 心脏线 */
  heartLine: string
  /** 事业线 / 命运线 */
  fateLine: string
  /** 木星丘（食指根） */
  mountJupiter: string
  /** 土星丘（中指根） */
  mountSaturn: string
  /** 太阳丘（无名指根） */
  mountApollo: string
  /** 水星丘（小指根） */
  mountMercury: string
  /** 金星丘（大鱼际） */
  mountVenus: string
  /** 月丘（小鱼际） */
  mountMoon: string
  /** 火星丘（掌心/虎口一带） */
  mountMars: string
  /**
   * Legacy summary blob (合成自七丘) — reading prompts / quality gates still read it.
   */
  mounts: string
  /** 指节比例 */
  fingerRatio: string
  /** 特殊纹记 */
  specialMarks: string
  /** 掌相整体简评 */
  overallAssessment: string
}

const PALM_LANDMARK_KEYS = [
  'handShape',
  'lifeLine',
  'headLine',
  'heartLine',
  'fateLine',
  'mountJupiter',
  'mountSaturn',
  'mountApollo',
  'mountMercury',
  'mountVenus',
  'mountMoon',
  'mountMars',
  'specialMarks',
] as const

/**
 * English anatomical phrases for Moondream palm pointing. Assume palm facing
 * camera, fingers toward top of image.
 */
const PALM_POINT_PHRASES: Record<(typeof PALM_LANDMARK_KEYS)[number], string> = {
  handShape: 'the center of the open palm surface (not the table background)',
  lifeLine: 'the life line palm crease curving around the thumb base on the palm',
  headLine: 'the head line palm crease across the middle of the palm (not a finger)',
  heartLine: 'the heart line palm crease just below the base of the fingers on the palm',
  fateLine: 'the fate line palm crease running vertically through the center of the palm',
  mountJupiter: 'the fleshy mount at the base of the index finger on the palm side',
  mountSaturn: 'the fleshy mount at the base of the middle finger on the palm side',
  mountApollo: 'the fleshy mount at the base of the ring finger on the palm side',
  mountMercury: 'the fleshy mount at the base of the little finger on the palm side',
  mountVenus: 'the thenar eminence at the base of the thumb on the palm',
  mountMoon: 'the hypothenar eminence along the outer lower edge of the palm',
  mountMars: 'the plain of Mars in the center of the palm between thumb and little finger',
  specialMarks: 'an unusual palm crease mark or island on the palm surface',
}

const PALM_FEATURES_SYSTEM_PROMPT = `你是一位精通中国传统手相学的专家（框架：主纹 + 丘位 + 纹记），同时具备计算机视觉分析能力。
请仔细观察图片中的手掌与掌纹，按下列字段提取结构化描述。

重要说明：
- 按照要求的 JSON Schema 精确输出，不得增删字段
- features 下每个字段给出简短的中文描述（5–20字），使用：生命线、智慧线、感情线、事业线、金星丘、木星丘、土星丘、太阳丘、水星丘、月丘、火星丘、指节、岛纹、十字等术语
- 七丘必须分字段写丰/平/塌（mountJupiter…mountMars），不要合成到一个 mounts 字段（schema 无 mounts）
- landmarks 为各线/丘在图片中的归一化坐标 (x,y)，范围 0.0–1.0，原点在图片左上角；线取中段可见点，丘取肉垫中心——禁止把所有点标在掌心同一处
- fingerRatio / overallAssessment 不需要 landmarks
- specialMarks（10–40字）：「类型+所在线或丘」；无则「无显著纹记」
- 如某部位不清晰，features 标 "unclear"，landmarks 可省略该 key
- 不要主观美丑评价，不要命运断语，只描述可见特征`

const PALM_FEATURES_SCHEMA = {
  type: 'object',
  properties: {
    features: {
      type: 'object',
      properties: {
        handShape: { type: 'string' },
        lifeLine: { type: 'string' },
        headLine: { type: 'string' },
        heartLine: { type: 'string' },
        fateLine: { type: 'string' },
        mountJupiter: { type: 'string' },
        mountSaturn: { type: 'string' },
        mountApollo: { type: 'string' },
        mountMercury: { type: 'string' },
        mountVenus: { type: 'string' },
        mountMoon: { type: 'string' },
        mountMars: { type: 'string' },
        fingerRatio: { type: 'string' },
        specialMarks: { type: 'string' },
        overallAssessment: { type: 'string' },
      },
      required: [
        'handShape',
        'lifeLine',
        'headLine',
        'heartLine',
        'fateLine',
        'mountJupiter',
        'mountSaturn',
        'mountApollo',
        'mountMercury',
        'mountVenus',
        'mountMoon',
        'mountMars',
        'fingerRatio',
        'specialMarks',
        'overallAssessment',
      ],
    },
    landmarks: {
      type: 'object',
      properties: landmarkProperties(PALM_LANDMARK_KEYS),
    },
  },
  required: ['features', 'landmarks'],
}

export type PalmLandmarks = Partial<
  Record<(typeof PALM_LANDMARK_KEYS)[number], { x: number; y: number }>
>

type PalmVlmFeatures = Omit<PalmFeatures, 'mounts'>

type PalmExtractPayload = { features: PalmVlmFeatures; landmarks?: PalmLandmarks }

/** Drop VLM midpoints that all pile in the palm center (classic failure mode). */
function landmarksLookClustered(lm: Partial<Record<string, LandmarkPoint>>): boolean {
  const pts = Object.values(lm).filter((p): p is LandmarkPoint => Boolean(p))
  if (pts.length < 4) return false
  let minX = 1
  let maxX = 0
  let minY = 1
  let maxY = 0
  for (const p of pts) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  return maxX - minX < 0.22 && maxY - minY < 0.18
}

/** Drop Moondream/VLM outliers (table edges, fingertips) before persisting. */
function sanitizePalmLandmarks(
  lm: Partial<Record<(typeof PALM_LANDMARK_KEYS)[number], LandmarkPoint>>
): PalmLandmarks {
  const clamp = (p: LandmarkPoint): LandmarkPoint => ({
    x: Math.min(1, Math.max(0, p.x)),
    y: Math.min(1, Math.max(0, p.y)),
  })

  const plausible = (
    key: (typeof PALM_LANDMARK_KEYS)[number],
    pt: LandmarkPoint
  ): boolean => {
    if (pt.x < 0.03 || pt.x > 0.97 || pt.y < 0.03 || pt.y > 0.97) return false
    if (key.startsWith('mount') && pt.y < 0.14) return false
    if (
      (key === 'lifeLine' ||
        key === 'headLine' ||
        key === 'fateLine' ||
        key === 'heartLine') &&
      pt.y < 0.07
    ) {
      return false
    }
    const cluster = Object.values(lm).filter((p): p is LandmarkPoint => Boolean(p))
    if (cluster.length >= 4) {
      const xs = cluster.map((p) => p.x).sort((a, b) => a - b)
      const ys = cluster.map((p) => p.y).sort((a, b) => a - b)
      const medX = xs[Math.floor(xs.length / 2)] ?? 0.5
      const medY = ys[Math.floor(ys.length / 2)] ?? 0.5
      if (Math.abs(pt.x - medX) > 0.3 || Math.abs(pt.y - medY) > 0.34) return false
    }
    return true
  }

  const out: PalmLandmarks = {}
  for (const key of PALM_LANDMARK_KEYS) {
    const raw = lm[key]
    if (!raw) continue
    const pt = clamp(raw)
    if (plausible(key, pt)) out[key] = pt
  }
  return out
}

function synthesizeMountsBlob(f: PalmVlmFeatures): string {
  const parts = [
    ['木星丘', f.mountJupiter],
    ['土星丘', f.mountSaturn],
    ['太阳丘', f.mountApollo],
    ['水星丘', f.mountMercury],
    ['金星丘', f.mountVenus],
    ['月丘', f.mountMoon],
    ['火星丘', f.mountMars],
  ] as const
  return parts
    .map(([label, v]) => `${label}${typeof v === 'string' && v.trim() ? v.trim() : 'unclear'}`)
    .join('，')
}

export async function extractPalmFeatures(
  env: Env,
  imageBase64: string,
  mimeType = 'image/jpeg'
): Promise<{ features: PalmFeatures; landmarks: PalmLandmarks; model: string }> {
  const result = await callVisionStructuredWithFallback<PalmExtractPayload>(
    { AI: env.AI, GEMINI_API_KEY: env.GEMINI_API_KEY },
    {
      systemPrompt: PALM_FEATURES_SYSTEM_PROMPT,
      userPrompt: '请按要求提取手相特征与 landmarks，只输出 JSON，不要任何额外文字。',
      images: [{ base64: imageBase64, mimeType }],
      responseSchema: PALM_FEATURES_SCHEMA as Record<string, unknown>,
      temperature: 0.2,
      maxOutputTokens: 2048,
      geminiThinkingLevel: 'MINIMAL',
      metricLabel: 'physiognomy_palm_extract',
    }
  )

  let vlmLm = result.data.landmarks ?? {}
  if (landmarksLookClustered(vlmLm)) {
    console.warn('[physiognomy] palm VLM landmarks clustered — dropping before Moondream merge')
    vlmLm = {}
  }

  let moondream = await extractLandmarksViaMoondream(
    env.AI,
    { base64: imageBase64, mimeType },
    PALM_POINT_PHRASES
  )
  if (landmarksLookClustered(moondream)) {
    console.warn('[physiognomy] palm Moondream landmarks clustered — retry once')
    moondream = await extractLandmarksViaMoondream(
      env.AI,
      { base64: imageBase64, mimeType },
      PALM_POINT_PHRASES
    )
    if (landmarksLookClustered(moondream)) {
      console.warn('[physiognomy] palm Moondream still clustered — keeping points anyway')
    }
  }

  const raw = result.data.features
  const features: PalmFeatures = {
    ...raw,
    mounts: synthesizeMountsBlob(raw),
  }

  return {
    features,
    landmarks: sanitizePalmLandmarks(mergeLandmarks(vlmLm, moondream)),
    model: result.model,
  }
}
