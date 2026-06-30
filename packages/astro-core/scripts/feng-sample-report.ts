/**
 * Feng deterministic sample-report harness (W1).
 *
 * Runs the SAME deterministic assembly as `feng-analyze.ts` (D1-D4) over a
 * scenario matrix and prints a readable report so the metaphysics layer can be
 * eyeballed for correctness WITHOUT a device, LLM, or live map APIs. Form
 * (砂/水/形煞) is supplied synthetically per scenario (the part that would come
 * from VLM/DEM/street); everything else is the real engine.
 *
 * Run:  cd packages/astro-core && bun scripts/feng-sample-report.ts
 * Judge against: docs/feng-acceptance-standard.md
 */

import {
  type BaguaPalace,
  classifyStar,
  computeBaZhai,
  computeFlyingStars,
  correlateFormAndStars,
  dateToFlyingYear,
  describePalaceCombination,
  detectPatterns,
  emptyFormByPalace,
  type FormByPalace,
  type Gender,
  getMonthByJie,
  monthlyChart,
  NINE_CHART_KEYS,
} from '../src/index'

interface Scenario {
  name: string
  facingDeg: number
  buildYear: number
  asOf: Date
  birth?: { date: string; gender: Gender }
  doorDeg?: number
  /** Synthetic 形势 overrides (would come from VLM/DEM/street). */
  form?: Partial<
    Record<BaguaPalace, Partial<{ hasMountain: boolean; hasWater: boolean; hasSha: boolean }>>
  >
}

const SCENARIOS: Scenario[] = [
  {
    name: '子山午向 · 9运今建今读 · 坎命 · 向首见水',
    facingDeg: 180,
    buildYear: 2024,
    asOf: new Date('2026-06-01T00:00:00Z'),
    birth: { date: '1990-06-01', gender: '男' },
    form: { 离: { hasWater: true }, 坎: { hasMountain: true } },
  },
  {
    name: '子山午向 · 8运建/9运读 · 双星会向 · 向首见水',
    facingDeg: 180,
    buildYear: 2010,
    asOf: new Date('2026-06-01T00:00:00Z'),
    birth: { date: '1985-03-10', gender: '女' },
    form: { 离: { hasWater: true } },
  },
  {
    name: '巽山乾向 · 8运 · 旺山旺向 · 坐山见山/向首见水',
    facingDeg: 315,
    buildYear: 2010,
    asOf: new Date('2026-06-01T00:00:00Z'),
    form: { 巽: { hasMountain: true }, 乾: { hasWater: true } },
  },
  {
    name: '戌山辰向 · 8运 · 上山下水 · 坐后有水/向前有山(救应)',
    facingDeg: 120,
    buildYear: 2010,
    asOf: new Date('2026-06-01T00:00:00Z'),
    form: { 乾: { hasWater: true }, 巽: { hasMountain: true } },
  },
  {
    name: '兼向 子山午向(172.6°) · 9运 · 替卦 · 无生辰',
    facingDeg: 172.6,
    buildYear: 2024,
    asOf: new Date('2026-06-01T00:00:00Z'),
    form: { 离: { hasWater: true }, 坎: { hasMountain: true } },
  },
]

function buildForm(s: Scenario): FormByPalace {
  const f = emptyFormByPalace()
  for (const [p, v] of Object.entries(s.form ?? {})) {
    const palace = p as BaguaPalace
    f[palace] = { ...f[palace], ...v }
  }
  return f
}

function grid(chart: Record<string, number>): string {
  const row = (a: string, b: string, c: string) =>
    `  ${chart[a]}(${a})  ${chart[b]}(${b})  ${chart[c]}(${c})`
  return [row('巽', '离', '坤'), row('震', '中', '兑'), row('艮', '坎', '乾')].join('\n')
}

function render(s: Scenario): string {
  const fs = computeFlyingStars({
    facingDegTrue: s.facingDeg,
    buildYear: s.buildYear,
    asOf: s.asOf,
  })
  const buildYun = fs.buildYuanYun.yuanYun
  const curYun = fs.currentYuanYun.yuanYun
  const sitPalace = fs.sitMountain.palace
  const facePalace = fs.faceMountain.palace

  const patterns = detectPatterns({
    yuanYun: buildYun,
    sitPalace,
    facePalace,
    periodChart: fs.periodChart,
    mountainChart: fs.mountainChart,
    facingChart: fs.facingChart,
  })

  const combinations = NINE_CHART_KEYS.map((k) => {
    const d = describePalaceCombination(fs.mountainChart[k], fs.facingChart[k], curYun)
    if (!d.combination) return null
    const label = d.name ?? `${fs.mountainChart[k]}-${fs.facingChart[k]}`
    return `${k}:${label}(${d.phase}) ${d.reading}`
  }).filter(Boolean)

  const doorPalace = s.doorDeg != null ? fs.faceMountain.palace : sitPalace
  const baZhai = s.birth
    ? computeBaZhai({
        birthDate: new Date(`${s.birth.date}T00:00:00Z`),
        gender: s.birth.gender,
        sitPalace,
        doorPalace,
      })
    : null

  const formByPalace = buildForm(s)
  const formLi = correlateFormAndStars({
    yuanYun: curYun,
    mountainChart: fs.mountainChart,
    facingChart: fs.facingChart,
    formByPalace,
    sitPalace,
    facePalace,
    patterns,
  })

  const flyingYear = dateToFlyingYear(s.asOf)
  const yearBranchIndex = (((flyingYear - 4) % 12) + 12) % 12
  const monthBranchIndex = getMonthByJie(
    s.asOf.getUTCFullYear(),
    s.asOf.getUTCMonth() + 1,
    s.asOf.getUTCDate()
  )
  const lunarMonth = ((monthBranchIndex - 2 + 12) % 12) + 1
  const monthly = monthlyChart(yearBranchIndex, lunarMonth)

  const lines: string[] = []
  lines.push(`\n## ${s.name}`)
  lines.push(
    `坐 ${fs.sitMountain.name}(${sitPalace}) 向 ${fs.faceMountain.name}(${facePalace}) · ` +
      `建运 ${buildYun} · 现运 ${curYun} · 排盘 ${fs.chartMethod}${fs.isCompoundFacing ? '(兼向)' : ''}`
  )
  lines.push('\n**山盘(山星)**')
  lines.push(grid(fs.mountainChart))
  lines.push('\n**向盘(向星)**')
  lines.push(grid(fs.facingChart))
  lines.push(
    `\n**旺衰(现运${curYun})** 当令=${curYun} 向首向星 ${fs.facingChart[facePalace]}=${classifyStar(fs.facingChart[facePalace], curYun)} · 坐山山星 ${fs.mountainChart[sitPalace]}=${classifyStar(fs.mountainChart[sitPalace], curYun)}`
  )
  lines.push(
    `\n**格局** ${patterns.length ? patterns.map((p) => `${p.kind}${p.scope && p.scope !== '全局' ? `(${p.scope})` : ''}`).join('、') : '平局'}`
  )
  for (const p of patterns) lines.push(`  - ${p.kind}: ${p.note}`)
  if (combinations.length) {
    lines.push('\n**双星组合断事**')
    for (const c of combinations) lines.push(`  - ${c}`)
  }
  if (baZhai) {
    lines.push(
      `\n**八宅** 命卦 ${baZhai.mingGua}(${baZhai.group}) · ${baZhai.concord?.verdict ?? ''} · ` +
        `门=${baZhai.placement.door.kind}${baZhai.placement.door.palace} 床头=${baZhai.placement.bedHead.kind}${baZhai.placement.bedHead.palace} ` +
        `灶坐${baZhai.placement.stove.sitAt.kind}${baZhai.placement.stove.sitAt.palace}向${baZhai.placement.stove.mouthToward.kind}${baZhai.placement.stove.mouthToward.palace} 书桌=${baZhai.placement.desk.kind}${baZhai.placement.desk.palace}`
    )
  } else {
    lines.push('\n**八宅** (无生辰，略)')
  }
  lines.push('\n**形理整合(山管人丁水管财)**')
  if (!formLi.palaces.length) lines.push('  外局清净，无逐宫断语')
  for (const pl of formLi.palaces)
    for (const f of pl.findings) lines.push(`  - ${pl.palace}·${f.verdict}: ${f.reason}`)
  for (const z of formLi.zhengLing.findings) lines.push(`  - 零正: ${z.reason}`)
  for (const r of formLi.patternRescue) lines.push(`  - 救应: ${r.note}`)
  lines.push(`\n**月紫白** 流月${lunarMonth}月 中宫=${monthly['中']}`)
  return lines.join('\n')
}

console.log('# Feng 样本报告(确定性层) — 自验')
console.log(
  '生成口径: 与 feng-analyze 一致；形势为合成输入。基准: docs/feng-acceptance-standard.md'
)
for (const s of SCENARIOS) console.log(render(s))
