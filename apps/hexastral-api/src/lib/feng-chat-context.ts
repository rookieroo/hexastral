/**
 * Build the feng report primary text for chat — synthesis chapters plus a compact
 * deterministic compute appendix so the model does not invent star numbers.
 */

const APPENDIX_HEADING = '## 确定性排盘摘要 (AUTHORITATIVE — do not contradict)'

interface ParsedCompute {
  sit?: string
  face?: string
  buildYuan?: number
  currentYuan?: number
  chartMethod?: string
  patterns?: string[]
  concord?: string
  formLiLines?: string[]
  /** Room types from interior join — chat must not invent names outside this list. */
  roomTypes?: string[]
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function parseCompute(computeJson: string): ParsedCompute | null {
  const root = asRecord(safeParseJson(computeJson))
  if (!root) return null

  const out: ParsedCompute = {}
  const fs = asRecord(root.flyingStars)
  if (fs) {
    const sit = asRecord(fs.sitMountain)
    const face = asRecord(fs.faceMountain)
    const build = asRecord(fs.buildYuanYun)
    const current = asRecord(fs.currentYuanYun)
    if (typeof sit?.name === 'string') out.sit = sit.name
    if (typeof face?.name === 'string') out.face = face.name
    if (typeof build?.yuanYun === 'number') out.buildYuan = build.yuanYun
    if (typeof current?.yuanYun === 'number') out.currentYuan = current.yuanYun
    if (typeof fs.chartMethod === 'string') out.chartMethod = fs.chartMethod
  }

  const patterns = root.patterns
  if (Array.isArray(patterns)) {
    out.patterns = patterns
      .map((p) => {
        const row = asRecord(p)
        return typeof row?.kind === 'string' ? row.kind : null
      })
      .filter((k): k is string => k != null)
  }

  const bz = asRecord(root.baZhai)
  const concord = asRecord(bz?.concord)
  if (typeof concord?.verdict === 'string') out.concord = concord.verdict

  const formLi = asRecord(root.formLi)
  const palaces = formLi?.palaces
  if (Array.isArray(palaces)) {
    const lines: string[] = []
    for (const pl of palaces) {
      const row = asRecord(pl)
      const palace = typeof row?.palace === 'string' ? row.palace : null
      const findings = row?.findings
      if (!palace || !Array.isArray(findings)) continue
      for (const f of findings) {
        const fr = asRecord(f)
        if (typeof fr?.verdict === 'string' && fr.verdict !== '平') {
          lines.push(`${palace}·${fr.verdict}`)
          if (lines.length >= 6) break
        }
      }
      if (lines.length >= 6) break
    }
    if (lines.length > 0) out.formLiLines = lines
  }

  const roomFindings = root.roomFindings
  if (Array.isArray(roomFindings)) {
    const types = new Set<string>()
    for (const rf of roomFindings) {
      const row = asRecord(rf)
      if (typeof row?.roomType === 'string' && row.roomType.length > 0) {
        types.add(row.roomType)
      }
    }
    if (types.size > 0) out.roomTypes = [...types]
  }

  return out
}

function formatAppendix(compute: ParsedCompute, dataQualityJson: string): string {
  const lines: string[] = [APPENDIX_HEADING]

  if (compute.sit && compute.face) {
    const method = compute.chartMethod ?? '下卦'
    const build = compute.buildYuan != null ? `${compute.buildYuan}运` : '?运'
    const current = compute.currentYuan != null ? `${compute.currentYuan}运` : '?运'
    lines.push(`坐${compute.sit}向${compute.face} · ${build}${method}盘 · 现${current}读盘`)
  }

  if (compute.patterns && compute.patterns.length > 0) {
    lines.push(`格局: ${compute.patterns.join('、')}`)
  } else {
    lines.push('格局: 平局')
  }

  if (compute.concord) lines.push(`宅命: ${compute.concord}`)
  if (compute.formLiLines) lines.push(`形理: ${compute.formLiLines.join('；')}`)
  if (compute.roomTypes && compute.roomTypes.length > 0) {
    lines.push(
      `室内房间白名单 (chat 仅可引用以下房间，禁止编造未列房间名): ${compute.roomTypes.join('、')}`
    )
  }

  const dq = asRecord(safeParseJson(dataQualityJson))
  if (typeof dq?.flyingStarsConfidence === 'string' && dq.flyingStarsConfidence !== 'high') {
    lines.push(`飞星置信: ${dq.flyingStarsConfidence}`)
  }
  if (typeof dq?.inputScore === 'number') {
    lines.push(`录入完整度: ${dq.inputScore}/100`)
  }

  lines.push('峦头形势为 AI/影像推断；以上理气与形理断语以本摘要为准。')
  return lines.join('\n')
}

/**
 * Primary reading text for feng chat: JSON chapters + deterministic appendix.
 */
export function buildFengChatPrimaryText(
  chaptersJson: string,
  computeJson: string,
  dataQualityJson: string
): string {
  const compute = parseCompute(computeJson)
  if (!compute) {
    return [chaptersJson, '', APPENDIX_HEADING, '(compute unavailable)'].join('\n')
  }
  return [chaptersJson, '', formatAppendix(compute, dataQualityJson)].join('\n')
}
