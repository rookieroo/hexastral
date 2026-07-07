#!/usr/bin/env bun
/**
 * Sync hexagram corpus + i18n bundles across packages.
 * - Validates 64 hexagrams in corpus.zh-CN.json
 * - Validates i18n overlays for en, ja, ko, zh-TW
 * - Copies i18n JSON to svc-astro for Worker bundle
 *
 * Usage: bun scripts/sync-hexagram-corpus.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const tokensHex = join(root, 'packages/hexastral-tokens/src/constants/hexagram')
const svcData = join(root, 'services/svc-astro/src/data/hexagram-i18n')

const LOCALES = ['en', 'ja', 'ko', 'zh-TW']
const EXPECTED = 64

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function main() {
  const corpusPath = join(tokensHex, 'corpus.zh-CN.json')
  if (!existsSync(corpusPath)) {
    console.error('Missing corpus.zh-CN.json — run extract first from hexagram-details.ts')
    process.exit(1)
  }

  const corpus = readJson(corpusPath)
  if (!Array.isArray(corpus) || corpus.length !== EXPECTED) {
    console.error(`Expected ${EXPECTED} hexagrams in corpus, got ${corpus?.length ?? 0}`)
    process.exit(1)
  }

  for (const locale of LOCALES) {
    const path = join(tokensHex, `i18n.${locale}.json`)
    const data = readJson(path)
    const keys = Object.keys(data)
    if (keys.length !== EXPECTED) {
      console.error(`i18n.${locale}.json: expected ${EXPECTED} entries, got ${keys.length}`)
      process.exit(1)
    }
    for (let n = 1; n <= EXPECTED; n++) {
      const entry = data[String(n)]
      if (!entry?.judgmentExplain || !Array.isArray(entry.keywords)) {
        console.error(`i18n.${locale}.json: missing fields for hexagram ${n}`)
        process.exit(1)
      }
    }
  }

  mkdirSync(svcData, { recursive: true })
  for (const locale of LOCALES) {
    const src = readFileSync(join(tokensHex, `i18n.${locale}.json`), 'utf8')
    writeFileSync(join(svcData, `i18n.${locale}.json`), src)
  }
  writeFileSync(join(svcData, 'corpus.zh-CN.json'), readFileSync(corpusPath, 'utf8'))

  console.log(`hexagram corpus OK: ${EXPECTED} hexagrams × ${LOCALES.length + 1} locales`)
  console.log(`synced i18n bundles to services/svc-astro/src/data/hexagram-i18n/`)
}

main()
