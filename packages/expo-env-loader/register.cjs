/**
 * Shared Expo env bootstrap for all `@zhop/*-app` / `hexastral-app` workspaces.
 *
 * Load order (later files override earlier):
 * `packages/expo-env-loader/base.env` → `.env.example` → `.env.local` → `.env`
 * - `base.env` — committed monorepo defaults for shared Expo values.
 * - `.env.example` — committed template / placeholders only (no secrets).
 * - `.env.local` — app-local overrides (gitignored).
 * - `.env` — optional personal overrides (gitignored).
 */
const fs = require('node:fs')
const path = require('node:path')
const dotenv = require('dotenv')
const { z } = require('zod/v4')

const SHARED_BASE = path.resolve(__dirname, 'base.env')
const APP_CHAIN = ['.env.example', '.env.local', '.env']
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Strip placeholders so `eas init` can run before a project id exists. */
function normalizeEasProjectId(value) {
  if (!hasValue(value)) return undefined
  const trimmed = value.trim()
  if (trimmed.startsWith('REPLACE_WITH_') || trimmed.startsWith('<')) return undefined
  return UUID_RE.test(trimmed) ? trimmed : undefined
}

const ExpoPublicEnvSchema = z
  .object({
    EXPO_PUBLIC_API_URL: z.url().optional(),
    EXPO_PUBLIC_EAS_PROJECT_ID: z.uuid().optional(),
    EXPO_PUBLIC_ENV: z.enum(['development', 'preview', 'production']),
    EXPO_PUBLIC_REVENUECAT_IOS_KEY: z.string().optional(),
    EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: z.string().optional(),
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: z.string().optional(),
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: z.string().optional(),
  })
  .strict()

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function validateExpoEnv(appRootDir) {
  const parsed = ExpoPublicEnvSchema.safeParse({
    EXPO_PUBLIC_API_URL: hasValue(process.env.EXPO_PUBLIC_API_URL)
      ? process.env.EXPO_PUBLIC_API_URL
      : undefined,
    EXPO_PUBLIC_EAS_PROJECT_ID: normalizeEasProjectId(process.env.EXPO_PUBLIC_EAS_PROJECT_ID),
    EXPO_PUBLIC_ENV: process.env.EXPO_PUBLIC_ENV,
    EXPO_PUBLIC_REVENUECAT_IOS_KEY: hasValue(process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY)
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
      : undefined,
    EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: hasValue(process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY)
      ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
      : undefined,
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: hasValue(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID)
      ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
      : undefined,
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: hasValue(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID)
      ? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
      : undefined,
  })

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ')
    throw new Error(`Invalid Expo env for ${appRootDir}: ${details}`)
  }
}

function registerExpoEnv(appRootDir) {
  if (fs.existsSync(SHARED_BASE)) dotenv.config({ path: SHARED_BASE, override: true })
  for (const name of APP_CHAIN) {
    const fp = path.join(appRootDir, name)
    if (fs.existsSync(fp)) dotenv.config({ path: fp, override: true })
  }
  validateExpoEnv(appRootDir)
}

module.exports = { registerExpoEnv }
