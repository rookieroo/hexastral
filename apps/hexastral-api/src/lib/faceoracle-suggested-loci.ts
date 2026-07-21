/**
 * Pass 0 — rule score VLM feature keys into SuggestedLoci for Pass 1.
 * Does not invent coordinates or fabricate feature text.
 */

export type SuggestedLocusPart = 'face' | 'palm_l' | 'palm_r'

export type SuggestedLocus = {
  featureKey: string
  part: SuggestedLocusPart
  reason: string
  score: number
}

const UNCLEAR_RE =
  /^(unclear|n\/?a|unknown|null|none|模糊|不清|无法|無法|看不清|不明显|不明顯|不能判断|不能判斷)\s*$/i

const FACE_KEYS = [
  'tianTing',
  'yinTang',
  'shanGen',
  'eyebrowType',
  'eyeType',
  'noseShape',
  'cheekBones',
  'philtrum',
  'mouthType',
  'chin',
  'jawline',
  'nasolabialFolds',
  'earLobes',
  'complexion',
  'boneStructure',
] as const

const PALM_KEYS = [
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

const TENSION_RE =
  /塌|陷|断|淺|浅|杂|弱|偏|燥|虚|滞|薄|散|乱|冲|克|岛|島|十字|锁|鎖|链|鏈|破|纹乱|紋亂/
const FULL_RE = /丰|豐|厚|深|长|長|清|润|潤|饱|飽/
const ISLAND_CROSS_RE = /岛|島|十字|锁纹|鎖紋|星纹|星紋/

/** Day-master / dayun stem → preferred mount / face keys. */
const STEM_ELEMENT: Record<string, 'wood' | 'fire' | 'earth' | 'metal' | 'water'> = {
  甲: 'wood',
  乙: 'wood',
  丙: 'fire',
  丁: 'fire',
  戊: 'earth',
  己: 'earth',
  庚: 'metal',
  辛: 'metal',
  壬: 'water',
  癸: 'water',
}

const ELEMENT_KEYS: Record<string, string[]> = {
  wood: ['mountJupiter', 'eyebrowType', 'shanGen'],
  fire: ['mountApollo', 'mountMars', 'complexion', 'philtrum'],
  earth: ['mountSaturn', 'noseShape', 'cheekBones'],
  metal: ['mountVenus', 'boneStructure', 'jawline'],
  water: ['mountMercury', 'mountMoon', 'earLobes', 'lifeLine'],
}

function isUnclear(v: string): boolean {
  const t = v.trim()
  if (t.length < 2) return true
  return UNCLEAR_RE.test(t)
}

function extractDayunElement(natalSummary: string): string | null {
  // currentDaYun=甲子 or dayMaster from pillars
  const m = natalSummary.match(/currentDaYun=([甲乙丙丁戊己庚辛壬癸])/)
  if (m?.[1]) return STEM_ELEMENT[m[1]] ?? null
  const dm = natalSummary.match(/"day"[^}]*"stem"\s*:\s*"([甲乙丙丁戊己庚辛壬癸])"/)
  if (dm?.[1]) return STEM_ELEMENT[dm[1]] ?? null
  // pillars JSON may use different shape — also try dayMaster= in natalFacts line
  const md = natalSummary.match(/dayMaster=([甲乙丙丁戊己庚辛壬癸])/)
  if (md?.[1]) return STEM_ELEMENT[md[1]] ?? null
  return null
}

function palmSideBoost(
  part: SuggestedLocusPart,
  natalSummary: string
): { innate: boolean; acquired: boolean } {
  if (part === 'face') return { innate: false, acquired: false }
  const innate = natalSummary.includes(`palmInnate=${part === 'palm_l' ? 'palm_l' : 'palm_r'}`)
    ? true
    : natalSummary.includes(`palmInnate=${part}`)
  const acquired = natalSummary.includes(`palmAcquired=${part}`)
  // palmInnate=left|right style from job uses palm_l / palm_r values
  const innateMatch = /palmInnate=(palm_l|palm_r)/.exec(natalSummary)
  const acquiredMatch = /palmAcquired=(palm_l|palm_r)/.exec(natalSummary)
  return {
    innate: innateMatch?.[1] === part || innate,
    acquired: acquiredMatch?.[1] === part || acquired,
  }
}

function scoreEntry(
  featureKey: string,
  value: string,
  part: SuggestedLocusPart,
  natalSummary: string,
  element: string | null
): SuggestedLocus | null {
  if (isUnclear(value)) return null
  let score = 1
  const reasons: string[] = ['clear']

  if (TENSION_RE.test(value)) {
    score += 3
    reasons.push('tension')
  }
  if (FULL_RE.test(value)) {
    score += 1
    reasons.push('full')
  }
  if (ISLAND_CROSS_RE.test(value)) {
    score += 4
    reasons.push('island_or_cross')
  }
  if (featureKey.startsWith('mount') && /塌|陷|平/.test(value)) {
    score += 2
    reasons.push('mount_collapse')
  }
  if (featureKey === 'specialMarks' && !/无显著|無顯著|无特殊|none/i.test(value)) {
    score += 3
    reasons.push('special_mark')
  }

  if (element && (ELEMENT_KEYS[element] ?? []).includes(featureKey)) {
    score += 2
    reasons.push(`dayun_${element}`)
  }

  const side = palmSideBoost(part, natalSummary)
  if (side.acquired) {
    score += 1.5
    reasons.push('acquired_hand')
  } else if (side.innate) {
    score += 0.5
    reasons.push('innate_hand')
  }

  // Prefer core lines slightly
  if (
    featureKey === 'lifeLine' ||
    featureKey === 'heartLine' ||
    featureKey === 'fateLine' ||
    featureKey === 'complexion' ||
    featureKey === 'yinTang'
  ) {
    score += 0.5
    reasons.push('core')
  }

  return {
    featureKey,
    part,
    reason: reasons.join('+'),
    score,
  }
}

function scoreMap(
  features: Record<string, string>,
  part: SuggestedLocusPart,
  keys: readonly string[],
  natalSummary: string,
  element: string | null
): SuggestedLocus[] {
  const out: SuggestedLocus[] = []
  for (const key of keys) {
    const v = features[key]
    if (typeof v !== 'string') continue
    // mounts blob — expand later if only legacy field present
    if (key === 'mounts') continue
    const hit = scoreEntry(key, v, part, natalSummary, element)
    if (hit) out.push(hit)
  }
  // Legacy single mounts blob: boost Venus/Jupiter if tension words present
  const mountsBlob = features.mounts
  if (typeof mountsBlob === 'string' && !isUnclear(mountsBlob) && TENSION_RE.test(mountsBlob)) {
    for (const mk of ['mountVenus', 'mountJupiter', 'mountMoon'] as const) {
      if (out.some((o) => o.featureKey === mk && o.part === part)) continue
      const existing = features[mk]
      if (typeof existing === 'string' && !isUnclear(existing)) continue
      out.push({
        featureKey: mk,
        part,
        reason: 'mounts_blob_tension',
        score: 2,
      })
    }
  }
  return out
}

/**
 * Rank clear VLM keys → top N suggested loci for Pass 1.
 */
export function buildSuggestedLoci(input: {
  face: Record<string, string>
  palmLeft: Record<string, string>
  palmRight: Record<string, string>
  natalSummary: string
  topN?: number
}): SuggestedLocus[] {
  const topN = input.topN ?? 20
  const element = extractDayunElement(input.natalSummary)
  const all = [
    ...scoreMap(input.face, 'face', FACE_KEYS, input.natalSummary, element),
    ...scoreMap(input.palmLeft, 'palm_l', PALM_KEYS, input.natalSummary, element),
    ...scoreMap(input.palmRight, 'palm_r', PALM_KEYS, input.natalSummary, element),
  ]
  all.sort((a, b) => b.score - a.score || a.featureKey.localeCompare(b.featureKey))

  // Ensure each part gets some candidates before global cut
  const byPart: Record<SuggestedLocusPart, SuggestedLocus[]> = {
    face: [],
    palm_l: [],
    palm_r: [],
  }
  for (const s of all) byPart[s.part].push(s)

  const seeded: SuggestedLocus[] = []
  const seen = new Set<string>()
  const take = (list: SuggestedLocus[], n: number) => {
    for (const s of list.slice(0, n)) {
      const k = `${s.part}:${s.featureKey}`
      if (seen.has(k)) continue
      seen.add(k)
      seeded.push(s)
    }
  }
  take(byPart.face, 6)
  take(byPart.palm_l, 5)
  take(byPart.palm_r, 5)
  for (const s of all) {
    if (seeded.length >= topN) break
    const k = `${s.part}:${s.featureKey}`
    if (seen.has(k)) continue
    seen.add(k)
    seeded.push(s)
  }
  return seeded.slice(0, topN)
}

export function formatSuggestedLociBlock(suggested: SuggestedLocus[]): string {
  if (suggested.length === 0) return ''
  const lines = suggested.map(
    (s, i) => `${i + 1}. ${s.part}/${s.featureKey} score=${s.score.toFixed(1)} reason=${s.reason}`
  )
  return [
    '## SuggestedLoci (Pass 0 — prioritize these; still omit if thin)',
    'Write deep readings for most of these. Quote reason tags in the 机理 when relevant.',
    ...lines,
  ].join('\n')
}

const CAUTION_RE = /杂|弱|断|浅|偏|燥|虚|滞|薄|散|乱|冲|克|对冲|波动|留意|风险|塌|陷|岛|島|十字/

export type LociCoverageResult = {
  ok: boolean
  face: number
  palm_l: number
  palm_r: number
  caution: number
  detail: string
}

export function assessLociCoverage(
  loci: Array<{ part?: string; reading?: string }>
): LociCoverageResult {
  let face = 0
  let palm_l = 0
  let palm_r = 0
  let caution = 0
  for (const l of loci) {
    const part = typeof l.part === 'string' ? l.part : ''
    const reading = typeof l.reading === 'string' ? l.reading : ''
    if (part === 'face') face += 1
    else if (part === 'palm_l') palm_l += 1
    else if (part === 'palm_r') palm_r += 1
    if (CAUTION_RE.test(reading)) caution += 1
  }
  const ok = face >= 5 && palm_l >= 5 && palm_r >= 5 && caution >= 2
  const detail = `face=${face} palm_l=${palm_l} palm_r=${palm_r} caution=${caution}`
  return { ok, face, palm_l, palm_r, caution, detail }
}
