#!/usr/bin/env bun
/**
 * seed-archetypes.ts — 命格预设 D1 批量导入
 *
 * 用法:
 *   bun run scripts/seed-archetypes.ts           # 本地 D1
 *   bun run scripts/seed-archetypes.ts --remote   # 生产 D1（需确认）
 *
 * 输入: scripts/archetype-presets.json
 *   格式: ArchetypePresetRow[] — 见下方类型定义
 *   期望: 960 行（10天干 × 12地支 × 2性别 × 4语言）(active=1, variant='A')
 *
 * 幂等性: INSERT OR IGNORE — UNIQUE 约束去重，安全重复执行
 *          --replace 旗标改用 INSERT OR REPLACE — 用于更新已存在行的内容
 */

import { randomUUID } from 'node:crypto'
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

type ArchetypePresetRow = {
  day_stem: string
  month_branch: string
  gender: '男' | '女'
  lang: string
  bullet_1: string
  bullet_2: string
  bullet_3: string
  fate_tease: string
  warning: string
  variant?: string
}

const isRemote = Bun.argv.includes('--remote')
const isReplace = Bun.argv.includes('--replace')
const flag = isRemote ? '--remote' : '--local'
const DB_NAME = 'hexastral-db'
const SCRIPTS_DIR = import.meta.dir
const API_ROOT = join(SCRIPTS_DIR, '..')

// ── Load & validate data ─────────────────────────────────────

const dataPath = join(SCRIPTS_DIR, 'archetype-presets.json')
let rows: ArchetypePresetRow[]

try {
  rows = JSON.parse(readFileSync(dataPath, 'utf8')) as ArchetypePresetRow[]
} catch {
  console.error(`❌  Could not read ${dataPath}`)
  console.info('    Create scripts/archetype-presets.json with 960 archetype rows first.')
  console.info('    See: docs/archetype-presets-schema.md for format details.')
  process.exit(1)
}

if (!Array.isArray(rows) || rows.length === 0) {
  console.error('❌  archetype-presets.json is empty or not an array')
  process.exit(1)
}

console.log(
  `\n📦  Seeding ${rows.length} rows → D1 (${isRemote ? 'REMOTE' : 'local'}) [${isReplace ? 'REPLACE' : 'IGNORE'}]`
)
if (isRemote) {
  console.warn('⚠️   Writing to PRODUCTION D1 — ensure data has been validated locally first!\n')
}

// ── Generate SQL ─────────────────────────────────────────────

const now = new Date().toISOString()

/** Escape single quotes for SQLite string literals */
function esc(s: string): string {
  return s.replace(/'/g, "''")
}

const values = rows.map((r) => {
  const variant = r.variant ?? 'A'
  const id = randomUUID()
  return (
    `('${id}','${esc(r.day_stem)}','${esc(r.month_branch)}','${esc(r.gender)}',` +
    `'${esc(r.lang)}','${esc(r.bullet_1)}','${esc(r.bullet_2)}','${esc(r.bullet_3)}',` +
    `'${esc(r.fate_tease)}','${esc(r.warning)}','${esc(variant)}',` +
    `0,0,1,'${now}','${now}')`
  )
})

// INSERT OR IGNORE — skips rows that violate the UNIQUE constraint (idempotent re-runs)
// INSERT OR REPLACE — deletes + re-inserts on conflict (use for updating existing content)
// Split into chunks to stay well under SQLite's SQLITE_TOOBIG statement limit
const CHUNK_SIZE = 50
const insertMode = isReplace ? 'INSERT OR REPLACE' : 'INSERT OR IGNORE'

function buildChunkSql(chunk: string[]): string {
  return (
    `${insertMode} INTO archetype_presets ` +
    `(id,day_stem,month_branch,gender,lang,bullet_1,bullet_2,bullet_3,` +
    `fate_tease,warning,variant,impressions,conversions,active,created_at,updated_at) VALUES\n` +
    chunk.join(',\n') +
    ';'
  )
}

// ── Write chunked SQL files & execute ────────────────────────────

const tmpFiles: string[] = []

for (let i = 0; i < values.length; i += CHUNK_SIZE) {
  const chunk = values.slice(i, i + CHUNK_SIZE)
  const tmpFile = join(tmpdir(), `seed-archetypes-${Date.now()}-${i}.sql`)
  writeFileSync(tmpFile, buildChunkSql(chunk))
  tmpFiles.push(tmpFile)
}

console.log(`   Split into ${tmpFiles.length} chunks of ≤${CHUNK_SIZE} rows`)

let ok = true
for (let i = 0; i < tmpFiles.length; i++) {
  const tmpFile = tmpFiles[i]!
  process.stdout.write(`   Chunk ${i + 1}/${tmpFiles.length}… `)
  const proc = Bun.spawnSync(
    ['bun', 'x', 'wrangler', 'd1', 'execute', DB_NAME, flag, `--file=${tmpFile}`],
    {
      cwd: API_ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    }
  )
  if (proc.exitCode !== 0) {
    console.error('FAILED')
    console.error(new TextDecoder().decode(proc.stderr))
    ok = false
    break
  }
  console.log('ok')
}

// Clean up temp files
for (const f of tmpFiles) {
  try {
    unlinkSync(f)
  } catch {
    /* ignore */
  }
}

if (!ok) {
  console.error('\n❌  Seed failed — check output above')
  process.exit(1)
}

console.log(`\n✅  Seeded ${rows.length} rows successfully.`)
if (!isRemote) {
  console.info('    Run validate-archetypes.ts to verify data integrity before going remote:')
  console.info('    bun run scripts/validate-archetypes.ts')
}
