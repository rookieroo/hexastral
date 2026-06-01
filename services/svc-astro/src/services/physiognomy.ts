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

import { callGeminiVision, callGeminiVisionStructured } from '@zhop/ai-vision'
import { buildAgeLanguageBlock } from '../lib/age'
import { type AiRouterEnv, callWithFallback } from '../lib/ai-router'
import { extractJson } from '../lib/extract-json'
import { buildLanguageBlock } from '../lib/i18n-prompt'
import { buildEnhancedGuardrails } from '../lib/prompts/guardrails'

/** 相术类型 */
export type PhysiognomyType = 'face' | 'palm'

// ── 面相特征提取 (隐私优先，结构化 JSON) ────────────────────────────────────

/**
 * 面相特征 Schema — 面相学十五维度
 * VLM 提取后存入 D1，等效于命格盘的数值化预处理
 */
export interface FaceFeatures {
  tianTing: string // 天庭（额头上部）
  yinTang: string // 印堂（两眉间）
  shanGen: string // 山根（鼻梁根部）
  foreheadWidth: string // 额头宽度格局
  eyebrowType: string // 眉型特征
  eyeType: string // 眼型神采
  noseShape: string // 鼻型（鼻梁+鼻头）
  cheekBones: string // 颧骨高低突度
  nasolabialFolds: string // 法令纹深浅走势
  mouthType: string // 嘴型唇色
  chin: string // 地阁（下巴）
  earLobes: string // 耳垂形态
  complexion: string // 气色肤色整体
  boneStructure: string // 整体骨骼格局
  overallAssessment: string // 面相整体格局简评（3句内）
}

const FACE_FEATURES_SYSTEM_PROMPT = `你是一位精通中国传统面相学的专家，同时具备计算机视觉分析能力。
请仔细观察图片中的面部特征，从面相学角度提取结构化特征。

重要说明：
- 按照要求的 JSON Schema 精确输出，不得增删字段
- 每个字段给出简短的中文描述（5-15字）
- 如某部位在图片中不清晰，标注值为 "unclear"
- 绝对不要包含对用户外貌的主观美丑评价`

const FACE_FEATURES_SCHEMA = {
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
}

/**
 * 面相特征结构化提取
 *
 * 使用 Gemini 3.1 Pro Vision + responseSchema 约束输出，
 * 返回结构化的面相特征 JSON，供后续合参报告复用。
 * 不存原图，只存特征向量。
 *
 * ⚠️ DeepSeek 无 VLM 能力，此步骤无文本备用。
 *    若 Gemini Vision 故障，向上抛出错误，hexastral-api 层处理。
 */
export async function extractFaceFeatures(
  apiKey: string,
  imageBase64: string,
  mimeType = 'image/jpeg'
): Promise<FaceFeatures> {
  return callGeminiVisionStructured<FaceFeatures>(apiKey, {
    systemPrompt: FACE_FEATURES_SYSTEM_PROMPT,
    userPrompt: '请按要求提取面相特征，只输出 JSON，不要任何额外文字。',
    images: [{ base64: imageBase64, mimeType }],
    responseSchema: FACE_FEATURES_SCHEMA,
    maxOutputTokens: 2048,
    temperature: 0.2,
    thinkingLevel: 'MEDIUM',
  })
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
