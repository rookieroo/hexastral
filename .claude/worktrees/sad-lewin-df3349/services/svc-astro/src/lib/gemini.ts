/**
 * Gemini AI Client — 服务于 svc-astro VLM (视觉网络模型) 能力
 *
 * 目前 Cloudflare Workers AI 的多模态支持依然不够覆盖这里的需求
 * 因此保留 Google GenAI 官方 SDK 来实现高精度的结构面相/手相识别。
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai'

export type GeminiThinkingLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL'

export type ChatMessage = {
  role: 'user' | 'model' | 'system' | 'assistant'
  content: string
}

/** 视觉分析：image + system prompt → description string */
export async function callGeminiVision(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  imageBase64: string,
  mimeType = 'image/jpeg',
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey })

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    config: {
      maxOutputTokens: 1024,
      temperature: 1.0,
      systemInstruction: systemPrompt,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
    contents: [
      {
        role: 'user',
        parts: [
          { text: userPrompt },
          { inlineData: { data: imageBase64, mimeType } },
        ],
      },
    ],
  })

  return response.text ?? ''
}

/**
 * 视觉分析结构化输出：image → 结构化 JSON
 *
 * 专用于面相特征提取—使用 Gemini 3.1 Pro Vision 获取高精度的
 * 结构化面相特征向量，通过 responseSchema 约束输出格式。
 */
export async function callGeminiVisionStructured<T>(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  imageBase64: string,
  responseSchema: object,
  mimeType = 'image/jpeg',
): Promise<T> {
  const ai = new GoogleGenAI({ apiKey })

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    config: {
      maxOutputTokens: 2048,
      temperature: 0.2,
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      responseSchema,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
    },
    contents: [
      {
        role: 'user',
        parts: [
          { text: userPrompt },
          { inlineData: { data: imageBase64, mimeType } },
        ],
      },
    ],
  })

  const text = response.text ?? '{}'
  return JSON.parse(text) as T
}
