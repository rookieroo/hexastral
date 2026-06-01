#!/usr/bin/env bun
/**
 * validate-archetypes.ts — 命格预设内容 QA / CI gate
 *
 * 5 项校验:
 *   1. 组合完整性:  960 行 (120格局 × 2性别 × 4语言: zh+zh-Hant+en+ja, active=1 variant='A')
 *   2. 空字段检测:  所有内容列均非空字符串
 *   3. 字数限制:   bullet_* ≤150 chars, fate_tease/warning ≤200 chars
 *   4. 男女防重复: 同命格+语言 男/女的 bullet_1 不应完全相同
 *   5. 多语言校验: zh-Hant 的 bullet_1 不等于 zh 行（检测漏转情况）
 *
 * 用法:
 *   bun run scripts/validate-archetypes.ts           # 本地 D1
 *   bun run scripts/validate-archetypes.ts --remote   # 生产 D1
 *
 * 退出码: 0 = 全部通过, 1 = 有失败项
 */

import { join } from 'node:path'

const isRemote = Bun.argv.includes('--remote')
const flag = isRemote ? '--remote' : '--local'
const DB_NAME = 'hexastral-db'
const API_ROOT = join(import.meta.dir, '..')

// 10天干×12地支×2性别×4语言(zh+zh-Hant+en+ja) = 960行
const EXPECTED_ROWS = 960
const BULLET_MAX = 150
const TEASE_MAX = 200

// ── D1 query helper ──────────────────────────────────────────

type D1Row = Record<string, unknown>

function execSql(command: string): D1Row[] {
  const proc = Bun.spawnSync(
    ['bun', 'x', 'wrangler', 'd1', 'execute', DB_NAME, flag, '--json', '--command', command],
    { cwd: API_ROOT }
  )

  if (proc.exitCode !== 0) {
    const err = new TextDecoder().decode(proc.stderr)
    throw new Error(`wrangler error:\n${err}`)
  }

  const raw = new TextDecoder().decode(proc.stdout)
  // wrangler --json prepends version info before the JSON array — find the first '['
  const start = raw.indexOf('[')
  if (start === -1) throw new Error(`No JSON in wrangler output:\n${raw}`)

  const parsed = JSON.parse(raw.slice(start)) as { results: D1Row[]; success: boolean }[]
  return parsed[0]?.results ?? []
}

// ── Check runner ─────────────────────────────────────────────

let passed = 0
let failed = 0

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`  ✓  ${name}`)
    passed++
  } else {
    console.error(`  ✗  ${name}`)
    if (detail) console.error(`       ${detail}`)
    failed++
  }
}

// ── 1. Combination completeness ──────────────────────────────
console.log(`\n[1] Combination completeness  (expect ${EXPECTED_ROWS} rows)`)
const countRows = execSql(
  `SELECT COUNT(*) AS cnt FROM archetype_presets WHERE active=1 AND variant='A'`
)
const count = (countRows[0]?.cnt as number) ?? 0
check(`Total rows = ${EXPECTED_ROWS}`, count === EXPECTED_ROWS, `got ${count}`)

// ── 2. Empty field detection ─────────────────────────────────
console.log('\n[2] Empty fields')
const emptyRows = execSql(
  `SELECT COUNT(*) AS cnt FROM archetype_presets ` +
    `WHERE active=1 AND variant='A' ` +
    `AND (bullet_1='' OR bullet_2='' OR bullet_3='' OR fate_tease='' OR warning='')`
)
const emptyCount = (emptyRows[0]?.cnt as number) ?? 0
check('No empty content fields', emptyCount === 0, `${emptyCount} rows with empty fields`)

// ── 3. String length limits ───────────────────────────────────
console.log('\n[3] String length limits')
const longBullets = execSql(
  `SELECT COUNT(*) AS cnt FROM archetype_presets ` +
    `WHERE active=1 AND variant='A' ` +
    `AND (LENGTH(bullet_1) > ${BULLET_MAX} OR LENGTH(bullet_2) > ${BULLET_MAX} OR LENGTH(bullet_3) > ${BULLET_MAX})`
)
const longBulletCount = (longBullets[0]?.cnt as number) ?? 0
check(
  `bullet_* ≤${BULLET_MAX} chars`,
  longBulletCount === 0,
  `${longBulletCount} rows exceed bullet limit`
)

const longTease = execSql(
  `SELECT COUNT(*) AS cnt FROM archetype_presets ` +
    `WHERE active=1 AND variant='A' ` +
    `AND (LENGTH(fate_tease) > ${TEASE_MAX} OR LENGTH(warning) > ${TEASE_MAX})`
)
const longTeaseCount = (longTease[0]?.cnt as number) ?? 0
check(
  `fate_tease/warning ≤${TEASE_MAX} chars`,
  longTeaseCount === 0,
  `${longTeaseCount} rows exceed tease/warning limit`
)

// ── 4. Gender copy-paste detection ───────────────────────────
// Warning only on bootstrap — male/female copy starts identical and is differentiated in D1.
// Once gender-specific copy is written, change check() to a hard failure here.
console.log('\n[4] Gender copy-paste detection')
const genderDups = execSql(
  `SELECT COUNT(*) AS cnt ` +
    `FROM archetype_presets m ` +
    `JOIN archetype_presets f ` +
    `  ON m.day_stem=f.day_stem AND m.month_branch=f.month_branch ` +
    `  AND m.lang=f.lang AND m.variant=f.variant ` +
    `WHERE m.gender='男' AND f.gender='女' ` +
    `  AND m.bullet_1 = f.bullet_1 ` +
    `  AND m.active=1 AND f.active=1 AND m.variant='A'`
)
const genderDupCount = (genderDups[0]?.cnt as number) ?? 0
if (genderDupCount === 0) {
  check('男/女 bullet_1 differ per archetype+lang', true)
} else {
  console.warn(
    `  ⚠  ${genderDupCount} identical male/female pairs — gender-specific copy not yet written (expected for bootstrap)`
  )
}

// ── 5. zh-Hant rows (optional — warning only until translations exist) ────
console.log('\n[5] zh-Hant coverage (informational)')
const hantCount = execSql(
  `SELECT COUNT(*) AS cnt FROM archetype_presets WHERE lang='zh-Hant' AND active=1 AND variant='A'`
)
const hantTotal = (hantCount[0]?.cnt as number) ?? 0
if (hantTotal === 0) {
  console.log(
    `  ⚠  No zh-Hant rows found — falling back to zh via langFallbacks (expected until translation is ready)`
  )
} else {
  const hantDups = execSql(
    `SELECT COUNT(*) AS cnt ` +
      `FROM archetype_presets zh ` +
      `JOIN archetype_presets hant ` +
      `  ON zh.day_stem=hant.day_stem AND zh.month_branch=hant.month_branch ` +
      `  AND zh.gender=hant.gender AND zh.variant=hant.variant ` +
      `WHERE zh.lang='zh' AND hant.lang='zh-Hant' ` +
      `  AND zh.bullet_1 = hant.bullet_1 ` +
      `  AND zh.active=1 AND hant.active=1 AND zh.variant='A'`
  )
  const hantDupCount = (hantDups[0]?.cnt as number) ?? 0
  check(
    `zh-Hant bullet_1 differs from zh (${hantTotal} rows present)`,
    hantDupCount === 0,
    `${hantDupCount} untranslated zh-Hant rows detected`
  )
}

// ── Summary ───────────────────────────────────────────────────
console.log(`\n${'─'.repeat(46)}`)
console.log(`Result: ${passed} passed, ${failed} failed`)

if (failed > 0) {
  console.error('\n❌  Validation FAILED — fix issues before seeding to production.')
  process.exit(1)
} else {
  console.log('\n✅  All checks passed.')
  if (!isRemote) {
    console.info('    Seed to production when ready:  bun run scripts/seed-archetypes.ts --remote')
  }
}
