/**
 * 面相/手相 Physiognomy Service
 *
 * 两阶段 Gemini Pipeline:
 * 1. Gemini Vision 看图写结构化描述
 * 2. Gemini Pro/Flash 结合玄学做解读
 *
 * 输入: base64 照片 + 可选的星宫命盘
 * 输出: 面相/手相解读
 */

import {
  callGeminiVision,
  callVisionStructuredWithFallback,
  extractLandmarksViaMoondream,
  type LandmarkPoint,
} from '@zhop/ai-vision'
import { buildAgeLanguageBlock } from '../lib/age'
import { type AiRouterEnv, callWithFallback } from '../lib/ai-router'
import { extractJson } from '../lib/extract-json'
import { buildLanguageBlock } from '../lib/i18n-prompt'
import { buildEnhancedGuardrails } from '../lib/prompts/guardrails'
import type { Env } from '../types'

/** 相术类型 */
export type PhysiognomyType = 'face' | 'palm'

// ── 面相特征提取 (隐私优先，结构化 JSON) ────────────────────────────────────

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

const PALM_LANDMARK_KEYS = [
  'handShape',
  'lifeLine',
  'headLine',
  'heartLine',
  'fateLine',
  'mounts',
  'specialMarks',
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

const PALM_POINT_PHRASES: Record<(typeof PALM_LANDMARK_KEYS)[number], string> = {
  handShape: 'the center of the palm',
  lifeLine: 'the life line curving around the base of the thumb',
  headLine: 'the head line crossing the middle of the palm',
  heartLine: 'the heart line below the fingers',
  fateLine: 'the fate line running vertically up the palm',
  mounts: 'the mount of Venus at the base of the thumb',
  specialMarks: 'a distinct cross or star mark on the palm',
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

/** Structured palm features — Xingqi canonical palm stack (主纹 + 丘位 mounts). */
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
  /** 丘位：金星丘、木星丘、土星丘、太阳丘、水星丘、月丘、火星丘等 */
  mounts: string
  /** 指节比例 */
  fingerRatio: string
  /** 特殊纹记 */
  specialMarks: string
  /** 掌相整体简评 */
  overallAssessment: string
}

const PALM_FEATURES_SYSTEM_PROMPT = `你是一位精通中国传统手相学的专家（框架：主纹 + 丘位），同时具备计算机视觉分析能力。
请仔细观察图片中的手掌与掌纹，按下列字段提取结构化描述。

重要说明：
- 按照要求的 JSON Schema 精确输出，不得增删字段
- features 下每个字段给出简短的中文描述（5-20字），尽量使用：生命线、智慧线、感情线、事业线、金星丘、木星丘、土星丘、太阳丘、水星丘、月丘、火星丘、指节等术语
- landmarks 下为主纹中点/丘位中心的归一化坐标 (x,y)，范围 0.0–1.0，原点在左上角；线纹取弧线中点，丘位取主丘中心
- 掌面清晰时，必须尽量给出 lifeLine / headLine / heartLine / fateLine / mounts 的 landmarks（至少 3 条主纹）；不要只标一个点
- fingerRatio / overallAssessment 不需要 landmarks
- mounts 字段请点名可见丘位（如「金星丘丰、月丘平」），不要空泛形容词堆砌
- 如某部位在图片中不清晰，features 标注值为 "unclear"，landmarks 可省略该 key
- 绝对不要包含对用户外貌的主观美丑评价
- 不要做命运断语，只描述可见特征`

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
        mounts: { type: 'string' },
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
        'mounts',
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

type PalmExtractPayload = { features: PalmFeatures; landmarks: PalmLandmarks }

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
      maxOutputTokens: 1536,
      geminiThinkingLevel: 'MINIMAL',
      metricLabel: 'physiognomy_palm_extract',
    }
  )
  const moondream = await extractLandmarksViaMoondream(
    env.AI,
    { base64: imageBase64, mimeType },
    PALM_POINT_PHRASES
  )
  return {
    features: result.data.features,
    landmarks: mergeLandmarks(result.data.landmarks ?? {}, moondream),
    model: result.model,
  }
}

/** VLM 描述结果 */
export interface VLMDescription {
  type: PhysiognomyType
  description: string
  rawTokens?: number
}

/** 面相/手相解读结果 */
export interface PhysiognomyReading {
  type: PhysiognomyType
  vlmDescription: string
  interpretation: PhysiognomyInterpretation
}

export interface PhysiognomyInterpretation {
  overview: string
  personality: string
  career: string
  relationship: string
  wealth: string
  health: string
  specialNotes: string
}

/**
 * System prompt for face description
 */
const FACE_SYSTEM_PROMPT = `你是一位专业的面部特征描述师。请从以下维度精确描述照片中人物的面部特征：
1. 三庭比例（上庭/中庭/下庭的相对长度）
2. 五眼比例（面部宽度与眼睛间距的关系）
3. 额头形状（高低、宽窄、饱满度、是否有纹路）
4. 眉型（浓淡、长短、弧度、眉间距）
5. 眼型（大小、形状、眼距、眼尾走向）
6. 鼻型（鼻梁高低、鼻头形状、鼻翼宽度）
7. 唇型（厚薄、上下唇比例、唇色）
8. 耳型（大小、耳垂、位置高低）
9. 面型（国字脸/瓜子脸/圆脸/长脸等）
10. 面部气色（肤色、光泽度、面部各区域色泽差异）

请只描述客观视觉特征，不要做任何命理解读。输出格式为纯文本段落。`

/**
 * System prompt for palm description
 */
const PALM_SYSTEM_PROMPT = `你是一位专业的手掌纹路描述师。请从以下维度精确描述照片中的掌纹特征：
1. 生命线（起点、弧度、长度、深浅、是否有分支/断裂）
2. 智慧线（起点、走向、长度、深浅、是否与生命线连接）
3. 感情线（起点、弧度、终点位置、深浅、是否有分支）
4. 命运线（有无、起点、走向、深浅）
5. 手掌形状（方形/长形/扇形）
6. 手指比例（各指长短比例、指节形状）
7. 掌丘（各掌丘的饱满程度）
8. 其他纹路（太阳线、婚姻线、健康线等）

请只描述客观视觉特征，不要做任何命理解读。输出格式为纯文本段落。`

/**
 * 阶段1: Gemini Vision 看图写描述
 *
 * 使用 Gemini 2.5 Flash Vision 分析照片并输出结构化特征描述
 */
export async function describePhysiognomy(
  apiKey: string,
  photoBase64: string,
  type: PhysiognomyType
): Promise<VLMDescription> {
  const systemPrompt = type === 'face' ? FACE_SYSTEM_PROMPT : PALM_SYSTEM_PROMPT
  const userPrompt = type === 'face' ? '请描述这张面部照片的特征' : '请描述这张手掌照片的掌纹特征'

  try {
    const description = await callGeminiVision(apiKey, {
      systemPrompt,
      userPrompt,
      imageBase64: photoBase64,
      model: 'gemini-3-flash-preview',
      maxOutputTokens: 1024,
      temperature: 1.0,
      thinkingLevel: 'LOW',
    })
    return { type, description }
  } catch (error) {
    throw new Error(`面相图片分析失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 阶段2: Gemini 玄学解读
 *
 * 输入: VLM 描述 + 可选的星宫命盘
 * 输出: 完整命理解读
 */
export async function interpretPhysiognomy(
  env: AiRouterEnv,
  vlmDescription: string,
  type: PhysiognomyType,
  stellarChartInfo?: string,
  isPro?: boolean,
  language = 'zh-CN',
  solarBirthDate?: string
): Promise<PhysiognomyInterpretation> {
  const typeLabel = type === 'face' ? '面相' : '手相'

  const systemPrompt = [
    `你是一位精通${typeLabel}学的相术师，传承华夏千年相学智慧。`,
    '',
    '**互动风格**：',
    `- 用"我从你的${typeLabel}中看到..."、"你的...显示..."开头`,
    '- 融合玄学意境与现代表达，避免机械列举',
    '- 建议具体可行，结合实际生活场景',
    '',
    buildEnhancedGuardrails('相由心生，运由己造'),
    '',
    `**输出格式要求**（严格按此JSON结构输出）：
{
  "overview": "整体评价 2-3 句话",
  "personality": "性格分析 2-3 句话",
  "career": "事业运势 2-3 句话",
  "relationship": "感情婚姻 2-3 句话",
  "wealth": "财运分析 2-3 句话",
  "health": "健康提示 2-3 句话",
  "specialNotes": "特别注意事项或开运建议 2-3 句话"
}`,
    solarBirthDate
      ? buildAgeLanguageBlock(solarBirthDate, language)
      : buildLanguageBlock(language, 'physiognomy'),
  ].join('\n')

  const userContent = stellarChartInfo
    ? `以下是${typeLabel}特征的详细描述：\n${vlmDescription}\n\n以下是此人的紫微命盘信息：\n${stellarChartInfo}\n\n请结合${typeLabel}学知识和紫微命盘，给出综合解读。`
    : `以下是${typeLabel}特征的详细描述：\n${vlmDescription}\n\n请根据${typeLabel}学知识给出解读。`

  const text = await callWithFallback(env, systemPrompt, userContent, {
    isPro,
    maxTokens: 2048,
    thinkingLevel: isPro ? 'HIGH' : 'MEDIUM',
    metricLabel: 'physiognomy',
    locale: language,
  })

  // 解析 JSON 输出
  try {
    const jsonStr = extractJson(text)
    if (jsonStr) {
      const parsed = JSON.parse(jsonStr)
      return {
        overview: parsed.overview ?? '',
        personality: parsed.personality ?? '',
        career: parsed.career ?? '',
        relationship: parsed.relationship ?? '',
        wealth: parsed.wealth ?? '',
        health: parsed.health ?? '',
        specialNotes: parsed.specialNotes ?? '',
      }
    }
  } catch {
    // JSON 解析失败，回退到纯文本
  }

  // 回退: 将整段文本放入 overview
  return {
    overview: text,
    personality: '',
    career: '',
    relationship: '',
    wealth: '',
    health: '',
    specialNotes: '',
  }
}

/**
 * 完整的面相/手相读取流程
 *
 * 1. Gemini Vision 描述
 * 2. Gemini 解读
 */
export async function generatePhysiognomyReading(
  env: AiRouterEnv,
  photoBase64: string,
  type: PhysiognomyType,
  options?: {
    stellarChartInfo?: string
    isPro?: boolean
    language?: string
    solarBirthDate?: string
  }
): Promise<PhysiognomyReading> {
  // 阶段1: Gemini Vision 描述
  const vlm = await describePhysiognomy(env.GEMINI_API_KEY, photoBase64, type)

  // 阶段2: 文本解读（fallback 容灾启动）
  const interpretation = await interpretPhysiognomy(
    env,
    vlm.description,
    type,
    options?.stellarChartInfo,
    options?.isPro,
    options?.language,
    options?.solarBirthDate
  )

  return {
    type,
    vlmDescription: vlm.description,
    interpretation,
  }
}
