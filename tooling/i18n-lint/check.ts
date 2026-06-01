#!/usr/bin/env bun
/**
 * i18n coverage lint — pre-release safety net.
 *
 * Verifies, for every translation surface in the monorepo:
 *
 *   1. **Key parity** (flat messages): every locale has the same key set as
 *      the master locale (`en`). A missing key is a runtime fallback to
 *      `undefined`, which the UI then renders as the literal key string —
 *      catch it here instead.
 *   2. **Placeholder parity**: `{varname}` interpolation tokens appearing in
 *      the master string must appear in every translated copy too. A missing
 *      placeholder = the value is silently dropped at runtime.
 *   3. **Non-empty values**: a key with `""` content is almost always a
 *      translator typo. Flag it.
 *   4. **Sectioned docs** (legal): per-locale JSON has matching `sections[]`
 *      count + non-empty title/content + last-updated set.
 *
 * Run locally:  bun tooling/i18n-lint/check.ts
 * Run per-app: `bun lint:i18n` (wired in each app's package.json)
 *
 * Exits 0 on success, 1 on any failure. Suitable for CI gates.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

// ── Surfaces ────────────────────────────────────────────────────────────
//
// Add a new entry here when a new translation surface lands. Use absolute
// monorepo-rooted paths so the script can be invoked from anywhere.

const ROOT = resolve(import.meta.dirname, '../..')

interface FlatSurface {
  kind: 'flat'
  /** Logical name shown in the report. */
  name: string
  /** Directory containing `{locale}.json` files. */
  dir: string
  /** Master locale — all other locales are compared against this one. */
  master: string
}

interface SectionedSurface {
  kind: 'sectioned'
  name: string
  dir: string
  /** Document slug prefix: files are `{slug}.{locale}.json`. */
  slug: string
  master: string
}

type Surface = FlatSurface | SectionedSurface

const SURFACES: Surface[] = [
  {
    kind: 'flat',
    name: 'fate-app/messages',
    dir: join(ROOT, 'apps/fate-app/messages'),
    master: 'en',
  },
  {
    kind: 'flat',
    name: 'hexastral-web/messages',
    dir: join(ROOT, 'apps/hexastral-web/messages'),
    master: 'en',
  },
  {
    kind: 'sectioned',
    name: 'hexastral-web/legal/privacy',
    dir: join(ROOT, 'apps/hexastral-web/lib/legal/data'),
    slug: 'privacy',
    master: 'en',
  },
  {
    kind: 'sectioned',
    name: 'hexastral-web/legal/terms',
    dir: join(ROOT, 'apps/hexastral-web/lib/legal/data'),
    slug: 'terms',
    master: 'en',
  },
]

// ── Helpers ─────────────────────────────────────────────────────────────

const FAIL = '\x1b[31m✗\x1b[0m'
const OK = '\x1b[32m✓\x1b[0m'
const WARN = '\x1b[33m⚠\x1b[0m'
const DIM = '\x1b[2m'
const RESET = '\x1b[0m'

interface Issue {
  kind: 'missing-key' | 'extra-key' | 'placeholder-drift' | 'empty-value' | 'structural'
  locale: string
  key?: string
  message: string
}

/**
 * Walk a JSON object and emit `[path, value]` for every string-valued leaf.
 * Nested objects use dot notation. Arrays are flattened as `key[0]`, `key[1]`.
 */
function* walkStrings(
  obj: unknown,
  prefix = ''
): Generator<[string, string], void, unknown> {
  if (obj == null) return
  if (typeof obj === 'string') {
    yield [prefix, obj]
    return
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      yield* walkStrings(obj[i], `${prefix}[${i}]`)
    }
    return
  }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k
      yield* walkStrings(v, path)
    }
  }
}

/** Extract `{varname}` placeholder names from a string. */
function placeholders(s: string): Set<string> {
  const out = new Set<string>()
  for (const m of s.matchAll(/\{(\w+)\}/g)) {
    if (m[1]) out.add(m[1])
  }
  return out
}

function loadJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown
}

// ── Flat checker ────────────────────────────────────────────────────────

function checkFlat(surface: FlatSurface): Issue[] {
  if (!existsSync(surface.dir)) {
    return [{ kind: 'structural', locale: '*', message: `directory missing: ${surface.dir}` }]
  }

  const files = readdirSync(surface.dir).filter((f) => f.endsWith('.json'))
  const locales = files.map((f) => f.replace(/\.json$/, ''))
  if (!locales.includes(surface.master)) {
    return [
      {
        kind: 'structural',
        locale: '*',
        message: `master locale "${surface.master}" missing in ${surface.dir}`,
      },
    ]
  }

  const contents: Record<string, Record<string, string>> = {}
  for (const locale of locales) {
    const raw = loadJson(join(surface.dir, `${locale}.json`))
    const map: Record<string, string> = {}
    for (const [path, value] of walkStrings(raw)) map[path] = value
    contents[locale] = map
  }

  const masterKeys = new Set(Object.keys(contents[surface.master] ?? {}))
  const issues: Issue[] = []

  for (const locale of locales) {
    if (locale === surface.master) continue
    const localeKeys = new Set(Object.keys(contents[locale] ?? {}))

    // Missing in this locale (vs master).
    for (const key of masterKeys) {
      if (!localeKeys.has(key)) {
        issues.push({ kind: 'missing-key', locale, key, message: `missing: ${key}` })
      }
    }
    // Extra in this locale (not in master) — stale entry.
    for (const key of localeKeys) {
      if (!masterKeys.has(key)) {
        issues.push({ kind: 'extra-key', locale, key, message: `extra: ${key}` })
      }
    }
    // Empty values.
    for (const key of localeKeys) {
      const v = contents[locale]?.[key] ?? ''
      if (v.trim() === '') {
        issues.push({ kind: 'empty-value', locale, key, message: `empty value: ${key}` })
      }
    }
    // Placeholder parity (only for keys present in both).
    for (const key of localeKeys) {
      if (!masterKeys.has(key)) continue
      const masterPh = placeholders(contents[surface.master]?.[key] ?? '')
      const localePh = placeholders(contents[locale]?.[key] ?? '')
      const missingPh: string[] = []
      const extraPh: string[] = []
      for (const p of masterPh) if (!localePh.has(p)) missingPh.push(p)
      for (const p of localePh) if (!masterPh.has(p)) extraPh.push(p)
      if (missingPh.length || extraPh.length) {
        issues.push({
          kind: 'placeholder-drift',
          locale,
          key,
          message: `placeholders ${
            missingPh.length ? `missing {${missingPh.join('}, {')}}` : ''
          }${missingPh.length && extraPh.length ? ' and ' : ''}${
            extraPh.length ? `extra {${extraPh.join('}, {')}}` : ''
          }`,
        })
      }
    }
  }
  return issues
}

// ── Sectioned checker ──────────────────────────────────────────────────

interface SectionDoc {
  lastUpdated?: unknown
  sections?: unknown
}

function checkSectioned(surface: SectionedSurface): Issue[] {
  const files = existsSync(surface.dir)
    ? readdirSync(surface.dir).filter(
        (f) => f.startsWith(`${surface.slug}.`) && f.endsWith('.json')
      )
    : []
  if (files.length === 0) {
    return [
      {
        kind: 'structural',
        locale: '*',
        message: `no ${surface.slug}.*.json files in ${surface.dir}`,
      },
    ]
  }

  const locales = files.map((f) => f.replace(`${surface.slug}.`, '').replace(/\.json$/, ''))
  if (!locales.includes(surface.master)) {
    return [
      {
        kind: 'structural',
        locale: '*',
        message: `master ${surface.master} missing for slug ${surface.slug}`,
      },
    ]
  }

  const docs: Record<string, SectionDoc> = {}
  for (const locale of locales) {
    docs[locale] = loadJson(join(surface.dir, `${surface.slug}.${locale}.json`)) as SectionDoc
  }

  const masterSections = Array.isArray(docs[surface.master]?.sections)
    ? (docs[surface.master]?.sections as { title?: unknown; content?: unknown }[])
    : []
  const masterCount = masterSections.length
  const issues: Issue[] = []

  for (const locale of locales) {
    const doc = docs[locale]
    if (!doc) continue

    if (typeof doc.lastUpdated !== 'string' || doc.lastUpdated.trim() === '') {
      issues.push({
        kind: 'structural',
        locale,
        message: 'missing or empty `lastUpdated`',
      })
    }

    const sections = Array.isArray(doc.sections)
      ? (doc.sections as { title?: unknown; content?: unknown }[])
      : []
    if (sections.length !== masterCount) {
      issues.push({
        kind: 'structural',
        locale,
        message: `section count drift: master=${masterCount}, locale=${sections.length}`,
      })
    }

    for (let i = 0; i < sections.length; i++) {
      const s = sections[i]
      if (!s || typeof s.title !== 'string' || s.title.trim() === '') {
        issues.push({
          kind: 'empty-value',
          locale,
          key: `sections[${i}].title`,
          message: 'empty title',
        })
      }
      if (!s || typeof s.content !== 'string' || s.content.trim() === '') {
        issues.push({
          kind: 'empty-value',
          locale,
          key: `sections[${i}].content`,
          message: 'empty content',
        })
      }
      // Placeholder parity against the same section index in the master.
      const masterSection = masterSections[i]
      if (
        s &&
        masterSection &&
        typeof s.content === 'string' &&
        typeof masterSection.content === 'string'
      ) {
        const masterPh = placeholders(masterSection.content)
        const localePh = placeholders(s.content)
        const missing: string[] = []
        const extra: string[] = []
        for (const p of masterPh) if (!localePh.has(p)) missing.push(p)
        for (const p of localePh) if (!masterPh.has(p)) extra.push(p)
        if (missing.length || extra.length) {
          issues.push({
            kind: 'placeholder-drift',
            locale,
            key: `sections[${i}].content`,
            message: `placeholders ${missing.length ? `missing {${missing.join('}, {')}}` : ''}${
              missing.length && extra.length ? ' and ' : ''
            }${extra.length ? `extra {${extra.join('}, {')}}` : ''}`,
          })
        }
      }
    }
  }

  return issues
}

// ── Main ────────────────────────────────────────────────────────────────

let anyFailures = false

for (const surface of SURFACES) {
  const issues = surface.kind === 'flat' ? checkFlat(surface) : checkSectioned(surface)
  if (issues.length === 0) {
    console.log(`${OK} ${surface.name}`)
  } else {
    anyFailures = true
    console.log(`${FAIL} ${surface.name}  ${DIM}(${issues.length} issue${issues.length === 1 ? '' : 's'})${RESET}`)
    // Group by locale for readability.
    const byLocale = new Map<string, Issue[]>()
    for (const i of issues) {
      const arr = byLocale.get(i.locale) ?? []
      arr.push(i)
      byLocale.set(i.locale, arr)
    }
    for (const [locale, list] of byLocale) {
      console.log(`  ${WARN} ${locale}  ${DIM}(${list.length})${RESET}`)
      // Cap output per locale to avoid drowning in noise.
      const head = list.slice(0, 12)
      for (const issue of head) console.log(`     ${issue.message}`)
      if (list.length > head.length) {
        console.log(`     ${DIM}... and ${list.length - head.length} more${RESET}`)
      }
    }
  }
}

if (anyFailures) {
  console.log(`\n${FAIL} i18n coverage check failed`)
  process.exit(1)
}
console.log(`\n${OK} all locales in coverage`)
