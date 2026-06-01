/**
 * Hexastral 配置 — 统一 API 端点
 *
 * 合并后只需一个 apiUrl，指向 hexastral-api Worker
 */

import Constants from 'expo-constants'

const ENV = {
  development: {
    apiUrl: 'http://localhost:3010',
  },
  preview: {
    apiUrl: 'https://api.hexastral.com',
  },
  production: {
    apiUrl: 'https://api.hexastral.com',
  },
}

type Environment = keyof typeof ENV

function getEnvironment(): Environment {
  const env = Constants.expoConfig?.extra?.env ?? process.env.EXPO_PUBLIC_ENV ?? 'development'
  if (env === 'production' || env === 'preview') return env
  return 'development'
}

export const config = {
  env: getEnvironment(),
  get apiUrl() {
    return process.env.EXPO_PUBLIC_API_URL ?? ENV[getEnvironment()].apiUrl
  },
  /** @deprecated Use apiUrl — kept for backward compatibility during migration */
  get yichingApiUrl() {
    return this.apiUrl
  },
  /** @deprecated Use apiUrl — kept for backward compatibility during migration */
  get stellarApiUrl() {
    return this.apiUrl
  },
}
