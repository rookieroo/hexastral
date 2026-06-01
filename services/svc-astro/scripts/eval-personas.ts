#!/usr/bin/env bun
/**
 * Persona Evaluation CLI
 *
 * Runs a fixed set of birth profiles through the deployed /shuangpan/analyze
 * endpoint and dumps results to JSON for manual rating.
 *
 * Usage:
 *   bun run scripts/eval-personas.ts --base-url=http://127.0.0.1:8787 [--out=eval-out.json]
 *   bun run scripts/eval-personas.ts --base-url=https://svc-astro.example.workers.dev
 *
 * Rating goals (manual review of out file):
 *   - >=70% of readings reference at least one chart-specific anchor
 *     (day master stem/element, palace name, sihua, da-yun bracket)
 *   - <5% use any phrase from the FORBIDDEN_PHRASES block
 *   - 100% pass STRUCTURED_RESPONSE_SCHEMA (already enforced by the API; failures show as HTTP 5xx)
 *   - Each persona's outputs should be linguistically distinguishable
 *     from a baseline "balanced" reading on the same chart.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

interface Profile {
  label: string
  expectedElement: '金' | '木' | '火' | '土' | '水'
  solarDate: string // YYYY-MM-DD
  timeIndex: number // 0..12 (0 = unknown, 1 = 子时...)
  gender: 'male' | 'female'
  longitude: number
  latitude: number
  timezone: string
}

// 10 profiles curated to cover the 5 day-master elements x 2 genders.
// Day-master elements verified via astro-core ganzhi tables.
const PROFILES: Profile[] = [
  // 金 → incisive
  {
    label: 'metal-m',
    expectedElement: '金',
    solarDate: '1990-09-15',
    timeIndex: 7,
    gender: 'male',
    longitude: 116.4,
    latitude: 39.9,
    timezone: 'Asia/Shanghai',
  },
  {
    label: 'metal-f',
    expectedElement: '金',
    solarDate: '1988-08-21',
    timeIndex: 5,
    gender: 'female',
    longitude: 121.5,
    latitude: 31.2,
    timezone: 'Asia/Shanghai',
  },
  // 木 → nurturing
  {
    label: 'wood-m',
    expectedElement: '木',
    solarDate: '1992-03-12',
    timeIndex: 6,
    gender: 'male',
    longitude: 113.3,
    latitude: 23.1,
    timezone: 'Asia/Shanghai',
  },
  {
    label: 'wood-f',
    expectedElement: '木',
    solarDate: '1995-04-08',
    timeIndex: 4,
    gender: 'female',
    longitude: 114.1,
    latitude: 22.5,
    timezone: 'Asia/Hong_Kong',
  },
  // 火 → playful
  {
    label: 'fire-m',
    expectedElement: '火',
    solarDate: '1991-06-18',
    timeIndex: 8,
    gender: 'male',
    longitude: 120.2,
    latitude: 30.3,
    timezone: 'Asia/Shanghai',
  },
  {
    label: 'fire-f',
    expectedElement: '火',
    solarDate: '1989-07-04',
    timeIndex: 3,
    gender: 'female',
    longitude: 104.1,
    latitude: 30.7,
    timezone: 'Asia/Shanghai',
  },
  // 土 → pragmatic
  {
    label: 'earth-m',
    expectedElement: '土',
    solarDate: '1993-11-22',
    timeIndex: 9,
    gender: 'male',
    longitude: 108.9,
    latitude: 34.3,
    timezone: 'Asia/Shanghai',
  },
  {
    label: 'earth-f',
    expectedElement: '土',
    solarDate: '1996-10-30',
    timeIndex: 2,
    gender: 'female',
    longitude: 117.2,
    latitude: 39.1,
    timezone: 'Asia/Shanghai',
  },
  // 水 → peer
  {
    label: 'water-m',
    expectedElement: '水',
    solarDate: '1990-12-25',
    timeIndex: 7,
    gender: 'male',
    longitude: 102.7,
    latitude: 25.0,
    timezone: 'Asia/Shanghai',
  },
  {
    label: 'water-f',
    expectedElement: '水',
    solarDate: '1994-01-15',
    timeIndex: 5,
    gender: 'female',
    longitude: 106.5,
    latitude: 29.6,
    timezone: 'Asia/Shanghai',
  },
]

const LANGUAGES = ['zh-CN', 'en'] as const

interface Args {
  baseUrl: string
  out: string
  isPro: boolean
  queryYear: number
}

function parseArgs(): Args {
  const args: Args = {
    baseUrl: '',
    out: `eval-personas-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
    isPro: false,
    queryYear: new Date().getFullYear(),
  }
  for (const a of process.argv.slice(2)) {
    const [k, v] = a.replace(/^--/, '').split('=', 2)
    if (k === 'base-url' && v) args.baseUrl = v.replace(/\/$/, '')
    else if (k === 'out' && v) args.out = v
    else if (k === 'pro') args.isPro = true
    else if (k === 'year' && v) args.queryYear = Number.parseInt(v, 10)
  }
  if (!args.baseUrl) {
    console.error('Missing --base-url=http://... (point to wrangler dev or deployed worker)')
    process.exit(2)
  }
  return args
}

interface RunResult {
  profile: string
  expectedElement: string
  language: string
  ok: boolean
  status: number
  latencyMs: number
  // Trimmed to keep file readable; full payload may be large.
  natalSummary?: string
  detectedElement?: string | null
  reading?: unknown
  error?: string
}

async function runOne(args: Args, profile: Profile, language: string): Promise<RunResult> {
  const body = {
    solarDate: profile.solarDate,
    timeIndex: profile.timeIndex,
    gender: profile.gender,
    longitude: profile.longitude,
    latitude: profile.latitude,
    timezone: profile.timezone,
    queryYear: args.queryYear,
    language,
    isPro: args.isPro,
  }
  const t0 = Date.now()
  try {
    const res = await fetch(`${args.baseUrl}/shuangpan/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const latencyMs = Date.now() - t0
    const text = await res.text()
    if (!res.ok) {
      return {
        profile: profile.label,
        expectedElement: profile.expectedElement,
        language,
        ok: false,
        status: res.status,
        latencyMs,
        error: text.slice(0, 500),
      }
    }
    const json = JSON.parse(text) as {
      consensus?: { natalSummary?: string }
      reading?: unknown
    }
    const natalSummary = json.consensus?.natalSummary ?? ''
    const m = natalSummary.match(/日主\s*[甲乙丙丁戊己庚辛壬癸]([金木水火土])/)
    return {
      profile: profile.label,
      expectedElement: profile.expectedElement,
      language,
      ok: true,
      status: res.status,
      latencyMs,
      natalSummary,
      detectedElement: m?.[1] ?? null,
      reading: json.reading,
    }
  } catch (err) {
    return {
      profile: profile.label,
      expectedElement: profile.expectedElement,
      language,
      ok: false,
      status: 0,
      latencyMs: Date.now() - t0,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

async function main() {
  const args = parseArgs()
  console.log(`[eval] base=${args.baseUrl} pro=${args.isPro} year=${args.queryYear}`)
  console.log(`[eval] running ${PROFILES.length} profiles x ${LANGUAGES.length} languages`)

  const results: RunResult[] = []
  for (const profile of PROFILES) {
    for (const lang of LANGUAGES) {
      process.stdout.write(`  ${profile.label} (${lang})… `)
      const r = await runOne(args, profile, lang)
      results.push(r)
      console.log(r.ok ? `ok ${r.latencyMs}ms` : `FAIL ${r.status} ${r.error?.slice(0, 80)}`)
    }
  }

  // Summary stats
  const okCount = results.filter((r) => r.ok).length
  const elementMatch = results.filter((r) => r.ok && r.detectedElement === r.expectedElement).length
  const avgLatency = results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: args.baseUrl,
    isPro: args.isPro,
    queryYear: args.queryYear,
    totalRuns: results.length,
    successful: okCount,
    elementMatchRate: `${elementMatch}/${results.length}`,
    avgLatencyMs: Math.round(avgLatency),
    results,
  }

  await mkdir(dirname(args.out), { recursive: true }).catch(() => {})
  await writeFile(args.out, JSON.stringify(summary, null, 2), 'utf-8')
  console.log(`\n[eval] wrote ${args.out}`)
  console.log(
    `[eval] success ${okCount}/${results.length}, element-match ${elementMatch}/${results.length}, avg ${Math.round(avgLatency)}ms`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
