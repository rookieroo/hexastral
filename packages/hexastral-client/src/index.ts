import type { AppType } from '@zhop/hexastral-api'
import { hc } from 'hono/client'

// ── Re-export all domain types so consumers only need one import ──
export type {
  ChartInput,
  ChartInterpretation,
  ChartMeta,
  ChartResult,
  DivinationDetail,
  DivinationReading,
  DivinationRecord,
  FateConsensus,
  FateDetail,
  FateNatalChart,
  FateRecord,
  FateResult,
  FateStellarChart,
  FateYearReading,
  FourPillarsShiShen,
  Gender,
  HehunCompatibility,
  HehunDimension,
  HehunPerson,
  HehunResult,
  HexagramData,
  HexagramListItem,
  HexagramResult,
  HooksBundle,
  MajorStar,
  NatalGeJu,
  NatalInterpretation,
  NatalPillar,
  NatalRecord,
  NatalResult,
  PalaceSummary,
  PhysiognomyInterpretation,
  PhysiognomyResult,
  PhysiognomyType,
  PillarShiShen,
  ReadingDetail,
  ReadingRecord,
  ShenshaWarning,
  ShiShen,
  User,
  VLMDescription,
} from '@zhop/hexastral-api'

export type { AppType }

/**
 * Platform-agnostic request signer callback.
 *
 * Receives method, path, and raw body string; returns a map of headers to
 * attach to the outgoing request (e.g. HMAC signature headers for iOS).
 */
export type RequestSigner = (
  method: string,
  path: string,
  body: string
) => Promise<Record<string, string>>

export interface HexastralClientOptions {
  /** Static or lazy-evaluated Bearer token (for web / authenticated sessions). */
  bearerToken?: string | (() => string | null | undefined)
  /** Async request signer — used for HMAC-SHA256 signing on iOS. */
  signRequest?: RequestSigner
  /** Additional static headers applied to every request. */
  headers?: Record<string, string>
}

/**
 * Creates a typed Hono RPC client for the hexastral API.
 *
 * Pass `signRequest` for iOS HMAC signing, `bearerToken` for web sessions, or
 * plain `headers` for simple use-cases.
 */
export function createHexastralClient(baseUrl: string, options: HexastralClientOptions = {}) {
  const { bearerToken, signRequest, headers: staticHeaders } = options

  const customFetch: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers)

    // Static headers
    if (staticHeaders) {
      for (const [k, v] of Object.entries(staticHeaders)) {
        headers.set(k, v)
      }
    }

    // Bearer token (web auth)
    if (bearerToken !== undefined) {
      const token = typeof bearerToken === 'function' ? bearerToken() : bearerToken
      if (token) headers.set('Authorization', `Bearer ${token}`)
    }

    // HMAC signing (iOS)
    if (signRequest) {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url
      const path = new URL(url).pathname
      const method = (init?.method ?? 'GET').toUpperCase()
      const body =
        init?.body == null
          ? ''
          : typeof init.body === 'string'
            ? init.body
            : JSON.stringify(init.body)
      const hmacHeaders = await signRequest(method, path, body)
      for (const [k, v] of Object.entries(hmacHeaders)) {
        headers.set(k, v)
      }
    }

    return fetch(input, { ...init, headers })
  }

  return hc<AppType>(baseUrl, { fetch: customFetch })
}

export type HexastralClient = ReturnType<typeof createHexastralClient>
