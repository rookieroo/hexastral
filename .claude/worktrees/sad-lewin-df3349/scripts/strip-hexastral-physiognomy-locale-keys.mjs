#!/usr/bin/env node
/**
 * One-off stripper: removes deprecated physiognomy / face-reading SKU keys from
 * hexastral-app locale files while preserving object structure.
 * Run from repo root: node scripts/strip-hexastral-physiognomy-locale-keys.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const LOCALES_DIR = path.join('apps', 'hexastral-app', 'locales')
const FILES = ['zh.ts', 'zh-Hant.ts', 'en.ts', 'ja.ts', 'ko.ts', 'de.ts', 'es.ts', 'vi.ts', 'th.ts']

const EXACT_KEYS = new Set([
  'tab_physiognomy',
  'disclaimer_type_physiognomy',
  'shop_cat_physiognomy',
  'shop_face_reading_label',
  'shop_face_reading_title',
  'shop_face_reading_desc',
  'profile_face_reading_section',
  'profile_face_reading_entry',
  'profile_face_reading_none',
  'palm_upload_title',
  'palm_upload_subtitle',
  'settings_face_reading',
  'settings_face_reading_hint',
  'settings_face_reading_none',
  'paywall_vs_physiognomy',
])

function shouldRemoveKey(key) {
  if (EXACT_KEYS.has(key)) return true
  if (key.startsWith('physiognomy_')) return true
  return false
}

function extractKey(line) {
  const m = line.match(/^\s+([A-Za-z0-9_]+)\s*:/)
  return m ? m[1] : null
}

function isSingleLineStringValue(line) {
  return /:\s*'[^']*',\s*$/.test(line) || /:\s*`[^`]*`,\s*$/.test(line)
}

function stripFile(content) {
  const lines = content.split('\n')
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === '// Physiognomy') continue
    if (trimmed.startsWith('// 面相')) continue

    const key = extractKey(line)
    if (key && shouldRemoveKey(key)) {
      if (isSingleLineStringValue(line)) {
        continue
      }
      // Multiline: key:\n    '...',
      if (line.match(/^\s+[A-Za-z0-9_]+\s*:\s*$/)) {
        let j = i + 1
        while (j < lines.length) {
          const L = lines[j]
          if (/^\s*'[^']*',\s*$/.test(L) || /^\s*'[^']+'\s*,\s*$/.test(L)) {
            j++
            break
          }
          if (/^\s*`[^`]*`,\s*$/.test(L)) {
            j++
            break
          }
          j++
        }
        i = j - 1
        continue
      }
      // key: 'start multiline
      if (line.match(/:\s*'[^']*$/)) {
        let j = i + 1
        while (j < lines.length) {
          const L = lines[j]
          if (L.includes("',") && /'/.test(L)) {
            j++
            break
          }
          j++
        }
        i = j - 1
        continue
      }
      continue
    }
    out.push(line)
  }
  return out.join('\n')
}

for (const f of FILES) {
  const p = path.join(LOCALES_DIR, f)
  const raw = fs.readFileSync(p, 'utf8')
  const next = stripFile(raw)
  fs.writeFileSync(p, next, 'utf8')
  console.log('stripped', p)
}
