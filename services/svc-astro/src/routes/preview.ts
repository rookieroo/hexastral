/**
 * 命格预览端点 — Dual-Chart Essence
 *
 * POST /preview — 双盘合参精华生成
 *
 * 输入: 完整出生数据 (solarDate / timeIndex / gender / lng / lat / tz / city)
 * 输出: PreviewEssence (3 personalityBullets + dualChartConsensus + 4 dimensionPulses
 *        + fateTease + warning + hookLine)
 *
 * Pipeline:
 *   1. generateNatalChart() — 八字（地支真太阳时 + 大运 + 调候 + 神煞）
 *   2. generateChart()      — 紫微（12 宫 + 主星亮度 + 四化）
 *   3. 抽取 chart-facts 块（中文，LLM 推理最强语境）
 *   4. callWithFallback() with responseSchema → PreviewEssence
 *
 * 成本: Free=Gemini Flash Lite (~$0.02/call), Pro=Gemini Pro
 * 缓存: iOS MMKV 24h（key 含 currentYear，自然按年滚动）
 */

import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod/v4'
import { callWithFallback } from '../lib/ai-router'
import { extractJson } from '../lib/extract-json'
import { dimensionEnum, directionEnum, previewEssenceSchema, toJsonSchema } from '../schemas'
import { generateNatalChart } from '../services/natal/natal'
import { generateChart } from '../services/stellar/stellar'
import type { Env } from '../types'

type AppEnv = { Bindings: Env }

export const previewRoutes = new Hono<AppEnv>()

const inputSchema = z.object({
  solarDate: z.string().min(1),
  timeIndex: z.int().min(0).max(12),
  clockMinutes: z.number().int().min(0).max(1439).optional(),
  calibrate: z.boolean().optional(),
  gender: z.enum(['男', '女']),
  longitude: z.number().optional(),
  latitude: z.number().optional(),
  timezoneId: z.string().optional(),
  city: z.string().optional(),
  userId: z.string().min(1),
  language: z.string().default('zh'),
  isPro: z.boolean().optional().default(false),
  /** Drives fateSignature wording in CRITICAL rule 8 (default classical). */
  fateSignatureStyle: z
    .enum(['classical', 'sharp', 'poetic', 'custom'])
    .optional()
    .default('classical'),
})

/** POST /preview — Dual-chart essence generation */
previewRoutes.post('/preview', async (c) => {
  const body = await c.req.json()
  const input = inputSchema.parse(body)

  // 1. Compute charts (deterministic, no network)
  const natal = generateNatalChart({
    solarDate: input.solarDate,
    timeIndex: input.timeIndex,
    clockMinutes: input.clockMinutes,
    calibrate: input.calibrate,
    gender: input.gender,
    longitude: input.longitude,
    latitude: input.latitude,
    timezoneId: input.timezoneId,
    city: input.city,
    userId: input.userId,
    language: input.language,
  })
  const { palaces, meta } = generateChart({
    solarDate: input.solarDate,
    timeIndex: input.timeIndex,
    gender: input.gender,
    longitude: input.longitude,
    city: input.city,
    userId: input.userId,
  })

  // 2. Build chart-facts block (always Chinese — LLM strongest reasoning corpus)
  const currentYear = new Date().getFullYear()
  const currentDayun = natal.daYun?.steps.find(
    (s) => currentYear >= s.startYear && currentYear <= s.endYear
  )
  const dominantShishen = natal.shishen
    ? [natal.shishen.year?.name, natal.shishen.month?.name, natal.shishen.hour?.name]
        .filter((x): x is NonNullable<typeof x> => !!x)
        .join('、')
    : ''

  const soulPalace = palaces.find((p) => p.name === '命宫')
  const soulMajorStars = soulPalace?.majorStars ?? []
  const soulStarsBlock = soulMajorStars
    .map((s) => {
      const tags = [s.brightness, s.mutagen].filter(Boolean).join('·')
      return tags ? `${s.name}(${tags})` : s.name
    })
    .join('、')

  // First 化忌 (mutagen='忌') star anywhere on the chart — 最关键的命格警示锚点
  let huajiHint = ''
  for (const p of palaces) {
    const ji = p.majorStars.find((s) => s.mutagen === '忌')
    if (ji) {
      huajiHint = `${ji.name}化忌于${p.name}`
      break
    }
  }

  const chartFacts = [
    `公历：${input.solarDate} 时辰序号${input.timeIndex}（${input.gender === '男' ? '男命' : '女命'}）`,
    `八字：${natal.pillars.year.label} ${natal.pillars.month.label} ${natal.pillars.day.label} ${natal.pillars.hour.label}`,
    `日主：${natal.pillars.day.stem}（${natal.dayMasterWuXing}） · 强弱：${natal.geju.dayMasterStrength}`,
    `格局：${natal.geju.primary} · 喜用：${natal.geju.favorableElement} · 忌神：${natal.geju.unfavorableElement}`,
    natal.tiaohou
      ? `调候用神：${natal.tiaohou.gods.join('、')}（${natal.tiaohouSatisfied ? '已得用' : '未得用'}）`
      : '',
    dominantShishen ? `主要十神：${dominantShishen}` : '',
    `紫微命主：${meta.soul} · 身主：${meta.body} · 五行局：${meta.fiveElementsClass}`,
    soulStarsBlock ? `命宫主星：${soulStarsBlock}` : '',
    huajiHint ? `化忌焦点：${huajiHint}` : '',
    currentDayun
      ? `当前大运：${currentDayun.ganZhi.label}（${currentDayun.startAge}-${currentDayun.endAge}岁，${currentDayun.startYear}-${currentDayun.endYear}年）`
      : '',
    `当前流年：${currentYear} 年`,
  ]
    .filter(Boolean)
    .join('\n')

  const langLabel = getLangLabel(input.language)

  const fateSignatureRule =
    input.fateSignatureStyle === 'sharp'
      ? '8. fateSignature: 恰好 4 个汉字；锋利机智、适合社交传播的「网感」四字签，骨架仍须来自日主五行×格局或命宫主星×四化。禁止人身攻击、恐吓、歧视、疾病或灾难断言、涉黄涉政。'
      : input.fateSignatureStyle === 'poetic'
        ? '8. fateSignature: 恰好 4 个汉字；偏意象与留白，仍须紧扣事实块骨架；禁止空泛鸡汤或与命盘无关的辞藻。'
        : input.fateSignatureStyle === 'custom'
          ? '8. fateSignature: 恰好 4 个汉字；在古典骨架上可略活泼，仍须完全来自事实块；禁止人身攻击、恐吓、歧视、疾病或灾难断言。'
          : '8. fateSignature: 古典四字命理签名（例：“金水互生” / “火炽冲天” / “阳刃赋型” / “贪狼化气”）。严格 4 个汉字，以日主五行×格局 或 命宫主星×四化 为骨架。全部输出语言什么都保留中文术语原貌。'

  // 3. Build prompt
  const systemPrompt = `你是一位精通八字 × 紫微合参的东方智慧顾问。
你的任务是基于下方"命盘事实块"，生成一份**双盘精华**预览，吸引用户深入了解自己的命盘。

CRITICAL OUTPUT RULES:
1. 所有内容必须**直接引用命盘事实块中的具体特征**（日主、格局、化忌、命宫主星、当前大运等）。禁止泛化、禁止占星化通用语。
2. personalityBullets: 3 条，每条 12-25 字（中文）/ 8-20 词（其他语言）。从日主五行 + 命宫主星组合出发，扎心、精准、有画面感。
3. dualChartConsensus: 1-2 句，50-80 字。**必须同时引用八字（日主/格局/调候）和紫微（命宫主星/化忌）**，呈现两盘合参的核心张力。
4. dimensionPulses: 严格 4 条，顺序固定 [career, wealth, love, health]：
   - direction: 'rising'(上升) | 'steady'(稳定) | 'falling'(下行)，根据当前大运 + 流年 + 化忌位置判断
   - score: 1-10 整数，与 direction 匹配（rising 7-9, steady 4-7, falling 2-4）
   - oneLine: 15-25 字（中文）/ 10-18 词（其他），引用具体命格特征
5. fateTease: 1 条 30-50 字，必须以"……"结尾。涉及当前大运/流年的具体张力。
6. warning: 1 条 20-35 字，必须以"……"结尾。点出化忌或忌神在命盘的反复模式。
7. hookLine: ≤20 字（中文）/ ≤12 词（其他），适合分享卡片的金句。
${fateSignatureRule}
9. 禁止使用：命中注定、必然、一定会、肯定、绝对、注定、宿命
10. 全部用 ${langLabel} 输出。命盘事实块保留中文术语原貌（如“紫微”/“七杀”），其余内容用目标语言。`

  const userPrompt = `命盘事实块：
${chartFacts}

请基于以上事实生成 PreviewEssence JSON。`

  // 4. Call LLM with structured schema
  const raw = await callWithFallback(c.env, systemPrompt, userPrompt, {
    isPro: input.isPro,
    // 900 was tight: full PreviewEssence (3 bullets + 4 dim pulses + consensus
    // + tease + warning + hookLine + 4-char fateSignature) frequently overran
    // mid-stream in CJK locales, producing truncated JSON → parse failure.
    maxTokens: 1400,
    temperature: 0.85,
    thinkingLevel: 'MINIMAL',
    tier: 'standard',
    metricLabel: 'preview-essence',
    locale: input.language,
    jsonMode: true,
    responseSchema: toJsonSchema(previewEssenceSchema),
  })

  const jsonStr = extractJson(raw)
  if (!jsonStr) {
    console.error('[preview] failed to extract JSON', raw.slice(0, 500))
    throw new HTTPException(500, { message: 'Failed to parse preview response' })
  }

  // Permissive parse — coerce numeric strings, allow missing fields, then normalise.
  // The strict schema was rejecting otherwise-usable LLM payloads (e.g. score as
  // string, missing optional bullet, alternate dimension casing) and burning a
  // full LLM call on a recoverable shape mismatch.
  let rawObj: unknown
  try {
    rawObj = JSON.parse(jsonStr)
  } catch (err) {
    console.error('[preview] JSON.parse failed', err, jsonStr.slice(0, 500))
    throw new HTTPException(500, { message: 'Invalid preview response structure' })
  }

  const permissiveDim = z.object({
    dimension: z
      .string()
      .transform((s) => s.toLowerCase().trim())
      .pipe(dimensionEnum),
    direction: z
      .string()
      .transform((s) => s.toLowerCase().trim())
      .pipe(directionEnum)
      .catch('steady' as const),
    score: z.coerce.number().min(1).max(10).catch(5),
    oneLine: z.string().catch(''),
  })

  const permissiveSchema = z.object({
    personalityBullets: z.array(z.string()).catch([]),
    fateTease: z.string().catch(''),
    warning: z.string().catch(''),
    dualChartConsensus: z.string().catch(''),
    dimensionPulses: z.array(z.unknown()).catch([]),
    hookLine: z.string().catch(''),
  })

  const loose = permissiveSchema.safeParse(rawObj)
  if (!loose.success) {
    console.error(
      '[preview] permissive schema failed (top-level shape unrecoverable)',
      loose.error.issues,
      jsonStr.slice(0, 500)
    )
    throw new HTTPException(500, { message: 'Invalid preview response structure' })
  }

  const parsed = loose.data

  // Defensive normalisation: enforce 4 dimensionPulses in canonical order
  const dimsOrder: Array<'career' | 'wealth' | 'love' | 'health'> = [
    'career',
    'wealth',
    'love',
    'health',
  ]
  const dimsByKey = new Map<string, z.infer<typeof permissiveDim>>()
  for (const d of parsed.dimensionPulses) {
    const r = permissiveDim.safeParse(d)
    if (r.success) dimsByKey.set(r.data.dimension, r.data)
  }
  const normalisedDims = dimsOrder.map(
    (key) =>
      dimsByKey.get(key) ?? {
        dimension: key,
        direction: 'steady' as const,
        score: 5,
        oneLine: '',
      }
  )

  // Pad personalityBullets to exactly 3 — empty strings render as skeleton ghost lines on iOS
  const bullets = parsed.personalityBullets.slice(0, 3)
  while (bullets.length < 3) bullets.push('')

  return c.json({
    personalityBullets: bullets as [string, string, string],
    fateTease: parsed.fateTease,
    warning: parsed.warning,
    dualChartConsensus: parsed.dualChartConsensus,
    dimensionPulses: normalisedDims,
    hookLine: parsed.hookLine,
    dayMaster: natal.pillars.day.stem,
    soulStar: meta.soul,
    bodyStar: meta.body,
    source: 'llm' as const,
    year: currentYear,
  })
})

function getLangLabel(lang: string): string {
  if (lang.startsWith('zh-Hant') || lang === 'zh-TW') return '繁體中文'
  if (lang.startsWith('zh')) return '简体中文'
  if (lang === 'en') return 'English'
  if (lang === 'ko') return '한국어'
  if (lang === 'ja') return '日本語'
  if (lang === 'de') return 'Deutsch'
  if (lang === 'es') return 'Español'
  if (lang === 'vi') return 'Tiếng Việt'
  if (lang === 'th') return 'ภาษาไทย'
  return 'English'
}
