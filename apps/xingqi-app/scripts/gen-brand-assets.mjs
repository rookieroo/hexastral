#!/usr/bin/env node
/**
 * Syel app icons from the paper+ink three-bead mark.
 *   bun scripts/gen-brand-assets.mjs
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const assets = join(here, '..', 'assets')
const PAPER = '#F4F1EA'
const INK = '#2C2A27'
const INK_MID = '#4A4742'
const MIST = '#C8C4BA'
const ARC = '#2C2A27'

function markG(scale) {
  return `<g transform="translate(32 32) scale(${scale}) translate(-32 -32)">
    <path d="M18 36 C24 29 28 27 32 27 C37 27 41 30 46 33" stroke="${ARC}" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.42"/>
    <circle cx="18" cy="36" r="4.4" fill="${MIST}"/>
    <circle cx="32" cy="27" r="3.4" fill="${INK_MID}"/>
    <circle cx="46" cy="33" r="2.7" fill="${INK}"/>
  </g>`
}

function svg(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 64 64">${body}</svg>`
}

const files = {
  'mark.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
    <path d="M18 36 C24 29 28 27 32 27 C37 27 41 30 46 33" stroke="${ARC}" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.42"/>
    <circle cx="18" cy="36" r="4.4" fill="${MIST}"/>
    <circle cx="32" cy="27" r="3.4" fill="${INK_MID}"/>
    <circle cx="46" cy="33" r="2.7" fill="${INK}"/>
  </svg>`,
  'icon.svg': svg(`<rect width="64" height="64" fill="${PAPER}"/>${markG(1.45)}`),
  'adaptive-icon.svg': svg(markG(1.2)),
  'splash.svg': svg(`<rect width="64" height="64" fill="${PAPER}"/>${markG(1.2)}`),
}

for (const [name, body] of Object.entries(files)) {
  writeFileSync(join(assets, name), `${body}\n`)
}

const rsvg = ['rsvg-convert', '/Users/chris/miniconda3/bin/rsvg-convert', '/opt/homebrew/bin/rsvg-convert']
function png(name) {
  const src = join(assets, `${name}.svg`)
  const dest = join(assets, `${name}.png`)
  let last
  for (const bin of rsvg) {
    try {
      execFileSync(bin, ['-w', '1024', '-h', '1024', src, '-o', dest])
      console.log(`wrote ${name}.png`)
      return
    } catch (e) {
      last = e
    }
  }
  throw last ?? new Error('rsvg-convert not found')
}

png('icon')
png('adaptive-icon')
png('splash')

const iosIcon = join(
  here,
  '..',
  'ios',
  'Syel',
  'Images.xcassets',
  'AppIcon.appiconset',
  'App-Icon-1024x1024@1x.png'
)
const splashDir = join(here, '..', 'ios', 'Syel', 'Images.xcassets', 'SplashScreenLegacy.imageset')
if (existsSync(iosIcon)) {
  copyFileSync(join(assets, 'icon.png'), iosIcon)
  console.log('synced AppIcon')
}
if (existsSync(splashDir)) {
  for (const f of ['image.png', 'image@2x.png', 'image@3x.png']) {
    copyFileSync(join(assets, 'splash.png'), join(splashDir, f))
  }
  console.log('synced SplashScreenLegacy')
}

mkdirSync(join(here, '..', 'ios'), { recursive: true })
