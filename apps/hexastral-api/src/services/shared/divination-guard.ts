/**
 * 占卜禁忌守卫 — 「卜筮有五不占」代码层强制执行
 *
 * 1. 精确哈希去重 (SHA-256 + 24h KV TTL) → 「一事不再卜」
 * 2. 语义去重 (BGE-M3 Embedding cos > 0.92, 6h) → 换个说法问同一问题
 * 3. 每日上限 20 次 → 「天机不可过泄」
 * 4. 问题质量守卫 (长度 / 戏言) → 「心不诚则灵不应」
 * 5. 排盘参数去重 (24h) → 同一命盘不可日日翻
 *
 * @see docs/hexastral-ai-architecture.md §六C
 */

// ── Types ──────────────────────────────────────────────────────

export type GuardReason =
  | 'duplicate_exact'
  | 'duplicate_semantic'
  | 'duplicate_chart'
  | 'daily_limit'
  | 'too_short'
  | 'insincere'
  | 'late_night'
  | 'other_destiny'
  | 'sensitive'

export type GuardResult =
  | { allowed: true }
  | { allowed: false; reason: GuardReason; guardKey: string; cacheKey?: string }

/** Guard key → i18n locale key mapping */
const GUARD_KEY_MAP: Record<GuardReason, string> = {
  duplicate_exact: 'guard_duplicate',
  duplicate_semantic: 'guard_duplicate_semantic',
  duplicate_chart: 'guard_chart',
  daily_limit: 'guard_daily_limit',
  too_short: 'guard_too_short',
  insincere: 'guard_insincere',
  late_night: 'guard_late_night',
  other_destiny: 'guard_other_destiny',
  sensitive: 'guard_sensitive',
}

// ── Sensitive topic patterns ───────────────────────────────────

const SENSITIVE_PATTERNS = [
  // 生死断言类
  /自杀|轻生|了结|不想活|活不下去|去死|自我了断|跳楼|割腕|上吊/,
  /suicide|kill myself|end my life|want to die|self.?harm/i,
  // 他人寿命 / 命运侵测类
  /他什么时候死|她还有多久|寿命还有多少|什么时候会死|能活多久/,
  /when will .* die|how long (does|will) .* live|how long to live/i,
  // 违法伤害类
  /如何伤害|如何报复|怎么骗|诈骗|怎么伤人|怎么杀/,
  /how to (harm|hurt|scam|defraud|injure|kill)/i,
]

const OTHER_DESTINY_PATTERNS = [
  /他[的]?命[运盘]|她[的]?命[运盘]|帮.{0,4}(看|算|批|排)/,
  /someone else'?s (fate|destiny|chart)/i,
]

const INSINCERE_PATTERNS = /^(测试|test|随便|随机|hello|hi|哈哈|嘿嘿|试试|aaa|123|asdf|qwer)/i

// ── Core guard check ───────────────────────────────────────────

export async function checkDivinationGuard(
  question: string,
  userId: string,
  env: { GUARD_KV: KVNamespace; AI: Ai },
  opts?: { userLocalHour?: number; skipSemantic?: boolean }
): Promise<GuardResult> {
  const cleanQ = question.trim()

  // 1. 敏感话题拦截（最高优先级）
  if (SENSITIVE_PATTERNS.some((p) => p.test(cleanQ))) {
    return { allowed: false, reason: 'sensitive', guardKey: GUARD_KEY_MAP.sensitive }
  }

  // 2. 他人命运
  if (OTHER_DESTINY_PATTERNS.some((p) => p.test(cleanQ))) {
    return { allowed: false, reason: 'other_destiny', guardKey: GUARD_KEY_MAP.other_destiny }
  }

  // 3. 长度守卫
  if (cleanQ.length < 5) {
    return { allowed: false, reason: 'too_short', guardKey: GUARD_KEY_MAP.too_short }
  }

  // 4. 戏言守卫
  if (INSINCERE_PATTERNS.test(cleanQ)) {
    return { allowed: false, reason: 'insincere', guardKey: GUARD_KEY_MAP.insincere }
  }

  // 5. 精确去重 (SHA-256 hash + 24h KV TTL)
  const questionHash = await sha256(`${userId}:${cleanQ}`)
  const exactKey = `guard:exact:${questionHash}`
  if (await env.GUARD_KV.get(exactKey)) {
    return { allowed: false, reason: 'duplicate_exact', guardKey: GUARD_KEY_MAP.duplicate_exact }
  }

  // 6. 语义去重 (Embedding cosine > 0.92, 6h window)
  if (!opts?.skipSemantic) {
    const recentKey = `guard:recent:${userId}`
    const recentRaw = await env.GUARD_KV.get<Array<{ v: number[]; ts: number }>>(recentKey, 'json')
    if (recentRaw?.length) {
      const currentVec = await embedText(env.AI, cleanQ)
      const sixHoursAgo = Date.now() - 6 * 3_600_000
      for (const { v, ts } of recentRaw) {
        if (ts < sixHoursAgo) continue
        if (cosineSimilarity(currentVec, v) > 0.92) {
          return {
            allowed: false,
            reason: 'duplicate_semantic',
            guardKey: GUARD_KEY_MAP.duplicate_semantic,
          }
        }
      }
    }
  }

  // 7. 每日上限 (20 次)
  const today = new Date().toISOString().slice(0, 10)
  const dailyKey = `guard:daily:${userId}:${today}`
  const dailyCount = Number((await env.GUARD_KV.get(dailyKey)) ?? '0')
  if (dailyCount >= 20) {
    return { allowed: false, reason: 'daily_limit', guardKey: GUARD_KEY_MAP.daily_limit }
  }

  // 8. 深夜提示 (23:00-01:00, 不阻断)
  if (opts?.userLocalHour !== undefined) {
    const h = opts.userLocalHour
    if (h >= 23 || h < 1) {
      // 不阻断，但返回 late_night 标记，让客户端显示 toast
      // 注意：这里仍然返回 allowed: true，前端自行处理提示
    }
  }

  return { allowed: true }
}

// ── Record successful divination ───────────────────────────────

export async function recordDivinationSuccess(
  question: string,
  userId: string,
  env: { GUARD_KV: KVNamespace; AI: Ai }
): Promise<void> {
  const cleanQ = question.trim()
  const hash = await sha256(`${userId}:${cleanQ}`)

  // 精确哈希 (24h TTL)
  await env.GUARD_KV.put(`guard:exact:${hash}`, '1', { expirationTtl: 86_400 })

  // 语义向量追加 (保留最近 10 条, 6h TTL)
  const recentKey = `guard:recent:${userId}`
  const vec = await embedText(env.AI, cleanQ)
  type RecentEmbedding = { v: number[]; ts: number }
  const existing: RecentEmbedding[] =
    (await env.GUARD_KV.get<RecentEmbedding[]>(recentKey, 'json')) ?? []
  const sixHoursAgo = Date.now() - 6 * 3_600_000
  const updated = [
    ...existing.filter((r: RecentEmbedding) => r.ts > sixHoursAgo),
    { v: vec, ts: Date.now() },
  ].slice(-10)
  await env.GUARD_KV.put(recentKey, JSON.stringify(updated), { expirationTtl: 21_600 })

  // 日计数器 +1
  const today = new Date().toISOString().slice(0, 10)
  const dailyKey = `guard:daily:${userId}:${today}`
  const count = Number((await env.GUARD_KV.get(dailyKey)) ?? '0')
  await env.GUARD_KV.put(dailyKey, String(count + 1), { expirationTtl: 86_400 })
}

// ── Chart dedup guard (stellar/natal/fate) ──────────

export async function checkChartGuard(
  module: 'stellar' | 'natal' | 'fate' | 'shuangpan' | 'pair',
  params: Record<string, string | number | undefined>,
  userId: string,
  kv: KVNamespace
): Promise<GuardResult> {
  // Normalize legacy module name
  const normalizedModule = module === 'shuangpan' ? 'fate' : module
  const hash = await sha256(`${userId}:${normalizedModule}:${JSON.stringify(params)}`)
  const cacheKey = `guard:chart:${normalizedModule}:${hash}`

  if (await kv.get(cacheKey)) {
    const guardKeyMap: Record<string, string> = {
      stellar: 'guard_chart',
      natal: 'guard_chart',
      fate: 'guard_chart',
      shuangpan: 'guard_chart',
      hehun: 'guard_chart_hehun',
    }
    return {
      allowed: false,
      reason: 'duplicate_chart',
      guardKey: guardKeyMap[normalizedModule] ?? 'guard_duplicate',
      cacheKey,
    }
  }

  return { allowed: true }
}

export async function recordChartSuccess(
  module: string,
  params: Record<string, string | number | undefined>,
  userId: string,
  kv: KVNamespace
): Promise<void> {
  const hash = await sha256(`${userId}:${module}:${JSON.stringify(params)}`)
  await kv.put(`guard:chart:${module}:${hash}`, '1', { expirationTtl: 86_400 })
}

// ── Utility functions ──────────────────────────────────────────

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16)
}

async function embedText(ai: Ai, text: string): Promise<number[]> {
  const result = (await ai.run('@cf/baai/bge-m3' as Parameters<typeof ai.run>[0], {
    text: [text],
  })) as unknown as { data: number[][] }
  return result.data[0]!
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!
    magA += a[i]! * a[i]!
    magB += b[i]! * b[i]!
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}
