/**
 * Turbo generators (Phase D.5).
 *
 * `bun gen satellite` scaffolds a new HexAstral satellite Expo app + matching
 * `hexastral-web` landing routes from a single `--slug` + `--name` pair.
 *
 * Usage:
 *   bun gen satellite --slug numerology --name "Numerology"
 *
 * Scaffolds (relative to repo root):
 *   apps/<slug>-app/
 *     package.json, app.json, app.config.cjs, eas.json, tsconfig.json,
 *     babel.config.js, metro.config.js, README.md
 *     app/_layout.tsx, app/index.tsx, app/settings.tsx
 *     lib/growth-config.ts, lib/theme.ts, lib/i18n.ts
 *     assets/README.md  (designer-blocked icon/splash)
 *   apps/hexastral-web/app/[locale]/<slug>/
 *     page.tsx (uses shared SatelliteLanding)
 *     try/page.tsx
 *     try/client.tsx
 *
 * Manual follow-ups (logged at end of run):
 *   1. cd apps/<slug>-app && eas init   → fills EAS_PROJECT_ID
 *   2. Apple Developer Identifiers → register com.hexastral.<slug>
 *   3. RevenueCat → create products
 *   4. Designer → icon.png + splash.png
 *
 * The generator deliberately keeps the scaffold minimal; brand-specific UI
 * (compute form, ritual, etc.) is out of scope and must be authored after.
 */

import type { PlopTypes } from '@turbo/gen'

interface SatelliteAnswers {
  slug: string
  name: string
  bundleSuffix: string
  glyph: string
}

const SLUG_PATTERN = /^[a-z][a-z0-9-]{1,28}[a-z0-9]$/

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setGenerator('satellite', {
    description:
      'Scaffold a HexAstral satellite Expo app + matching hexastral-web landing/try routes.',
    prompts: [
      {
        type: 'input',
        name: 'slug',
        message: 'URL slug (kebab-case, e.g. "numerology" or "tarot-five")',
        validate: (input: string) => {
          if (!SLUG_PATTERN.test(input)) {
            return 'Slug must be lowercase kebab-case, 3–30 chars, no leading/trailing dash.'
          }
          return true
        },
      },
      {
        type: 'input',
        name: 'name',
        message: 'Human display name (e.g. "Numerology" / "Tarot Five")',
        validate: (input: string) =>
          input.trim().length >= 2 ? true : 'Name must be at least 2 characters.',
      },
      {
        type: 'input',
        name: 'bundleSuffix',
        message:
          'iOS bundle suffix (joins to com.hexastral.<suffix>) — usually slug without dashes',
        default: (answers: { slug: string }) => answers.slug.replace(/-/g, ''),
      },
      {
        type: 'input',
        name: 'glyph',
        message: 'Hero glyph for the web landing (single char, e.g. "✦", "相", "5")',
        default: '✦',
      },
    ],
    actions: (rawAnswers): PlopTypes.ActionType[] => {
      const a = rawAnswers as unknown as SatelliteAnswers
      const slug = a.slug
      const appDir = `apps/${slug}-app`
      const webDir = `apps/hexastral-web/app/[locale]/${slug}`

      const targetApp = slug.replace(/-/g, '')

      const data = {
        slug,
        slugCamel: slug.replace(/-(\w)/g, (_, c) => c.toUpperCase()),
        slugPascal: slug
          .split('-')
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(''),
        name: a.name,
        bundleSuffix: a.bundleSuffix,
        targetApp,
        glyph: a.glyph,
      }

      return [
        // ── Satellite app ────────────────────────────────────────────────
        {
          type: 'add',
          path: `${appDir}/package.json`,
          templateFile: 'templates/satellite/package.json.hbs',
          data,
        },
        {
          type: 'add',
          path: `${appDir}/app.json`,
          templateFile: 'templates/satellite/app.json.hbs',
          data,
        },
        {
          type: 'add',
          path: `${appDir}/app.config.cjs`,
          templateFile: 'templates/satellite/app.config.cjs.hbs',
          data,
        },
        {
          type: 'add',
          path: `${appDir}/eas.json`,
          templateFile: 'templates/satellite/eas.json.hbs',
          data,
        },
        {
          type: 'add',
          path: `${appDir}/tsconfig.json`,
          templateFile: 'templates/satellite/tsconfig.json.hbs',
          data,
        },
        {
          type: 'add',
          path: `${appDir}/babel.config.js`,
          templateFile: 'templates/satellite/babel.config.js.hbs',
          data,
        },
        {
          type: 'add',
          path: `${appDir}/metro.config.js`,
          templateFile: 'templates/satellite/metro.config.js.hbs',
          data,
        },
        {
          type: 'add',
          path: `${appDir}/README.md`,
          templateFile: 'templates/satellite/README.md.hbs',
          data,
        },
        {
          type: 'add',
          path: `${appDir}/app/_layout.tsx`,
          templateFile: 'templates/satellite/app/_layout.tsx.hbs',
          data,
        },
        {
          type: 'add',
          path: `${appDir}/app/index.tsx`,
          templateFile: 'templates/satellite/app/index.tsx.hbs',
          data,
        },
        {
          type: 'add',
          path: `${appDir}/app/settings.tsx`,
          templateFile: 'templates/satellite/app/settings.tsx.hbs',
          data,
        },
        {
          type: 'add',
          path: `${appDir}/lib/growth-config.ts`,
          templateFile: 'templates/satellite/lib/growth-config.ts.hbs',
          data,
        },
        {
          type: 'add',
          path: `${appDir}/lib/theme.ts`,
          templateFile: 'templates/satellite/lib/theme.ts.hbs',
          data,
        },
        {
          type: 'add',
          path: `${appDir}/lib/i18n.ts`,
          templateFile: 'templates/satellite/lib/i18n.ts.hbs',
          data,
        },
        {
          type: 'add',
          path: `${appDir}/assets/README.md`,
          templateFile: 'templates/satellite/assets-README.md.hbs',
          data,
        },

        // ── Web landing + try ────────────────────────────────────────────
        {
          type: 'add',
          path: `${webDir}/page.tsx`,
          templateFile: 'templates/web/landing-page.tsx.hbs',
          data,
        },
        {
          type: 'add',
          path: `${webDir}/try/page.tsx`,
          templateFile: 'templates/web/try-page.tsx.hbs',
          data,
        },
        {
          type: 'add',
          path: `${webDir}/try/client.tsx`,
          templateFile: 'templates/web/try-client.tsx.hbs',
          data,
        },

        // ── Final tip ────────────────────────────────────────────────────
        () => {
          const tips = [
            '',
            `✓ Scaffold for ${a.name} (slug: ${slug}) created.`,
            '',
            'Manual follow-ups:',
            `  1. cd apps/${slug}-app && eas init  → fills EAS_PROJECT_ID`,
            `     Paste the project ID into app.json (extra.eas.projectId)`,
            `     and the four EXPO_PUBLIC_EAS_PROJECT_ID slots in eas.json.`,
            `  2. Apple Developer → Identifiers → register com.hexastral.${a.bundleSuffix}`,
            `  3. App Store Connect → create app`,
            `  4. RevenueCat → create products ${slug}_pro_monthly / ${slug}_pro_annual`,
            `  5. Designer → assets/icon.png and assets/splash.png`,
            '',
            `Verify with:  bun typecheck`,
            '',
          ]
          return tips.join('\n')
        },
      ]
    },
  })
}
