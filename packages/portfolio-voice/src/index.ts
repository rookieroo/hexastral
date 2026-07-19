/**
 * Shared voice + compliance spec for HexAstral portfolio LLM outputs.
 * SSOT: docs/decisions/0003-portfolio-voice-compliance.md
 */

/** Hard forbidden — production should retry generation when these appear. */
export const PORTFOLIO_VOICE_FORBIDDEN_SUBSTRINGS = [
  '必死',
  '一定死',
  '绝症',
  '确诊',
  '你得了',
  '三天内必',
  '百分百会',
  '铁口直断',
  '劫数到了',
  '魂魄将散',
  '命中注定',
  '一定发财',
  '必定发财',
  '保证发财',
  '桃花必来',
  'definitely will',
  'guaranteed to',
  'ironclad prediction',
] as const

/** Soft forbidden — log in production; tighten over time. */
export const PORTFOLIO_VOICE_SOFT_FORBIDDEN_SUBSTRINGS = [
  '运势',
  '预测',
  '吉凶',
  '择日',
  '改运',
  'fortune-telling',
  'will definitely',
] as const

/**
 * Kanyu (svc-feng) synthesis — hard retry tier on top of portfolio hard list.
 * Talisman / outcome-promise phrasing that slips past generic guardrails.
 */
export const FENG_SYNTHESIS_FORBIDDEN_SUBSTRINGS = [
  '金蟾',
  '文昌塔',
  '铜葫芦',
  '銅葫蘆',
  '貔貅',
  '麒麟',
  '招财猫',
  '招財貓',
  '八卦镜',
  '八卦鏡',
  '凸镜',
  '凹镜',
  '开光',
  '開光',
  '提升运势',
  '提升運勢',
  '增强财气',
  '增強財氣',
  '贵人运',
  '貴人運',
  '改运',
  '改運',
  '转运',
  '轉運',
  'wealth toad',
  'lucky cat',
] as const

const FENG_SYNTHESIS_AUDIT_PATTERNS: readonly string[] = [
  ...PORTFOLIO_VOICE_FORBIDDEN_SUBSTRINGS,
  ...FENG_SYNTHESIS_FORBIDDEN_SUBSTRINGS,
]

export type PortfolioVoiceForbiddenHit = {
  pattern: string
  index: number
}

export function auditInterpretationAgainstForbiddenList(
  text: string,
  patterns: readonly string[] = PORTFOLIO_VOICE_FORBIDDEN_SUBSTRINGS
): PortfolioVoiceForbiddenHit[] {
  const lower = text.toLowerCase()
  const hits: PortfolioVoiceForbiddenHit[] = []
  for (const p of patterns) {
    const idx = lower.indexOf(p.toLowerCase())
    if (idx >= 0) hits.push({ pattern: p, index: idx })
  }
  return hits
}

export function auditHardForbiddenHits(text: string): PortfolioVoiceForbiddenHit[] {
  return auditInterpretationAgainstForbiddenList(text, PORTFOLIO_VOICE_FORBIDDEN_SUBSTRINGS)
}

export function auditSoftForbiddenHits(text: string): PortfolioVoiceForbiddenHit[] {
  return auditInterpretationAgainstForbiddenList(text, PORTFOLIO_VOICE_SOFT_FORBIDDEN_SUBSTRINGS)
}

/** svc-feng report synthesis — portfolio hard + feng talisman/outcome patterns. */
export function auditFengSynthesisHits(text: string): PortfolioVoiceForbiddenHit[] {
  return auditInterpretationAgainstForbiddenList(text, FENG_SYNTHESIS_AUDIT_PATTERNS)
}

/** Build a retry suffix when hard forbidden phrases appear in model output. */
export function buildForbiddenRewriteSuffix(hits: PortfolioVoiceForbiddenHit[]): string {
  const patterns = [...new Set(hits.map((h) => h.pattern))]
  return [
    '',
    'REWRITE REQUIRED: remove or rephrase these forbidden phrases:',
    ...patterns.map((p) => `- "${p}"`),
    'Keep reflection / cultural-study framing; no predictions or guarantees.',
  ].join('\n')
}

/** Terms §3 compliance block — inject into every LLM system prompt. */
export function buildComplianceInstructionBlock(locale: string): string {
  if (locale.startsWith('zh-Hant') || locale === 'zh-TW') {
    return [
      '## 合規與口吻（必須遵守 — Terms §3 / App Store 4.3(b)）',
      '- 定位：娛樂、文化探索、個人觀照；不是保證結果的專業決策依據。',
      '- 自稱：文化解讀 / 自我觀照顧問；不是「風水師改運保證者」。',
      '- 用語模态：傾向、適合、可考慮、傳統上認為、宜留意——只柔化語氣，不降低內容上限。',
      '- 禁止（鐵口保證）：注定、必然、一定、鐵口、保證發財/治病/桃花必來、must、definitely、certainly、guaranteed。',
      '- 允許並要求（付費價值）：十年級／當前大運＋下一運的場景主張、尖銳短板、可截圖的 aha 金句；用柔性措辭包裝鋒利內容。',
      '- 「預測」禁的是保證結果與宿命定論，不是禁止大運／十年窗口與選邊主張。',
      '- 建議：僅可執行的行為調整、情緒邊界、起居節奏；禁符咒、開光、靈物、改運儀式。',
      '- 結尾意識：娛樂與文化參照——但正文必須有信息量與共鳴，不得因合規寫成空心好話。',
    ].join('\n')
  }
  if (locale.startsWith('zh')) {
    return [
      '## 合规与口吻（必须遵守 — Terms §3 / App Store 4.3(b)）',
      '- 定位：娱乐、文化探索、个人观照；不是保证结果的专业决策依据。',
      '- 自称：文化解读 / 自我观照顾问；不是「风水师改运保证者」。',
      '- 用语模态：倾向、适合、可考虑、传统上认为、宜留意——只柔化语气，不降低内容上限。',
      '- 禁止（铁口保证）：注定、必然、一定、铁口、保证发财/治病/桃花必来、must、definitely、certainly、guaranteed。',
      '- 允许并要求（付费价值）：十年级／当前大运＋下一运的场景主张、尖锐短板、可截图的 aha 金句；用柔性措辞包装锋利内容。',
      '- 「预测」禁的是保证结果与宿命定论，不是禁止大运／十年窗口与选边主张。',
      '- 建议：仅可执行的行为调整、情绪边界、起居节奏；禁符咒、开光、灵物、改运仪式。',
      '- 结尾意识：娱乐与文化参照——但正文必须有信息量与共鸣，不得因合规写成空心好话。',
    ].join('\n')
  }
  if (locale === 'ja') {
    return [
      '## コンプライアンス（必須 — Terms §3 / App Store 4.3(b)）',
      '- 位置づけ：娯楽・文化探索・内省のための参照。予言・専門助言・結果保証ではない。',
      '- 自称：文化解読 / 自己観照の伴走者。占い師・改運の保証者ではない。',
      '- 禁止：注定、必然、铁口、predict、definitely、certainly、guaranteed outcomes。',
      '- 提案：実行可能な行動調整のみ。呪符・開光・霊物・儀式は勧めない。',
    ].join('\n')
  }
  if (locale === 'ko') {
    return [
      '## 준수 사항 (필수 — Terms §3 / App Store 4.3(b))',
      '- 목적: 오락, 문화 탐구, 개인 성찰. 예언·전문 조언·결과 보장 아님.',
      '- 금지: destined, definitely, certainly, predict, guaranteed wealth/health/love outcomes.',
      '- 제안: 실행 가능한 행동 조정만. 부적·의식·영물 권하지 않음.',
    ].join('\n')
  }
  return [
    '## Compliance (required — Terms §3 / App Store 4.3(b))',
    '- Purpose: entertainment, cultural exploration, personal reflection — NOT guaranteed outcomes or professional decision authority.',
    '- Persona: cultural interpreter / self-reflection companion — never a fate-changer promising results.',
    '- Modality only: tendency / may suit / consider / worth noting — softens wording, does NOT lower insight ceiling.',
    '- Forbidden (ironclad guarantees): destined, fated, definitely, certainly, guaranteed wealth/health/love.',
    '- Allowed and required (paid value): decade-scale / current+next 大运 scene claims, blunt shortcomings, screenshot-worthy aha lines — sharp content in soft modality.',
    '- Ban on “prediction” means no guaranteed outcomes or fatalism — NOT a ban on decade luck windows or sided claims.',
    '- Advice: actionable behavior, boundaries, pacing only — no talismans, rituals, or superstitious objects.',
    '- Closing: entertainment/cultural study — but body copy must still deliver information density and resonance; compliance must not produce empty praise.',
  ].join('\n')
}

/** Daoist voice for CoinCast + dream oracle prompts. */
export function buildPortfolioVoiceInstructionBlock(locale: string): string {
  const zh = locale.startsWith('zh')
  if (zh) {
    return [
      '## 口吻与哲学（必须遵守）',
      '- 核心：道家「人身小天地」——梦/卦象是内在气血、情志、脏腑隐喻的显影，不是外在宿命的判决书。',
      '- 结构：全文自然融合三层——「引」俗谚或卦辞引子；「转」落到用户自身小宇宙（情志、起居、呼吸、微行动）；「合」以《易经》变易智慧收束为可执行的平衡练习（72 小时内可完成的一步）。',
      '- 禁止：恐吓式断言、铁口吉凶、医疗诊断或用药建议；若涉及身心痛苦，温和建议寻求专业帮助。',
      '- 自称：温厚道者、山居友伴式语气；不用算命先生恐吓口吻。',
    ].join('\n')
  }
  return [
    '## Voice and philosophy (required)',
    '- Core: Daoist framing of the body-mind as a small cosmos — dreams / hexagrams mirror inner weather (qi, emotion, regulation), not fixed external fate.',
    '- Shape: weave three layers — (1) lead with a familiar folk or classical line; (2) turn to the user’s inner world with gentle, embodied language; (3) close with I Ching as wisdom of change — one concrete step within 72 hours.',
    '- Forbidden: doom phrasing, medical diagnosis or prescriptions; if distress is severe, suggest professional support kindly.',
    '- Persona: a warm mountain hermit friend — never a coercive fortune-teller.',
  ].join('\n')
}
