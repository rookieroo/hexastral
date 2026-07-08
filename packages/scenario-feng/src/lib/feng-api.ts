/**
 * Hand-written RPC façade for `/api/feng/*`.
 *
 * Background: Hono's `hc<AppType>()` stops inferring deep route trees once
 * the app grows past a certain size — Kindred hit this last phase and shipped
 * `kindred-bonds-api.ts` for the same reason. We do the same here for Fēng.
 *
 * The factory takes a HexastralClient and returns a typed surface that hides
 * the `.api.feng.sites` chain so consumers don't fight the inference depth
 * limit. Authentication (HMAC signer / bearer) is already wired into the
 * client.
 *
 * Runtime path: still goes through the same `fetch` used by hc.
 */

import type { HexastralClient } from '@zhop/hexastral-client'
import type {
  FengAnnotatedMapResponse,
  FengAnnotatedTile,
  FengJobResponse,
  FengSite,
  FengSiteWithLatestReport,
} from '../types'

interface ApiClient {
  api: {
    feng: {
      sites: unknown
      jobs: unknown
      maps: unknown
      reports: unknown
      declination: unknown
    }
    compass: unknown
  }
}

function rpc(client: HexastralClient): ApiClient {
  return client as unknown as ApiClient
}

// ── Sites ───────────────────────────────────────────────────────────────────

export interface FloorplanImageInput {
  key: string
  orientDeg?: number
  label?: string
}

export interface FloorplanInput {
  /** True-north bearing of the plans' top edge (north-align step). */
  orientDeg: number
  images: FloorplanImageInput[]
  /** Normalized 中宫 center (0–1) from the floor-plan align step. */
  centerNorm?: { x: number; y: number }
}

/** User-declared residence type — pricing tier + report-depth axis. */
export type FengResidenceType = 'apartment' | 'flat' | 'villa'

export interface CreateSiteInput {
  name: string
  label?: string
  /** apartment 公寓/小区单元 · flat 大平层 · villa 独栋/别墅. Defaults apartment server-side. */
  residenceType?: FengResidenceType
  lat: number
  lng: number
  formattedAddress: string
  facingDegTrue: number
  magneticDeclination: number
  doorDegTrue?: number
  buildYear?: number
  buildYearAccuracy: 'exact' | 'decade' | 'moveIn' | 'unknown'
  moveInYear?: number
  floor?: number
  /** 户型图 (interior 堪舆) — cover key + full set. Omit for exterior-only. */
  floorplanKey?: string
  floorplan?: FloorplanInput
}

export interface PatchSiteInput extends Partial<CreateSiteInput> {}

export function fengSites(client: HexastralClient) {
  const sites = rpc(client).api.feng.sites as {
    $get: () => Promise<Response>
    $post: (opts: { json: CreateSiteInput }) => Promise<Response>
    ':id': {
      $get: (opts: { param: { id: string } }) => Promise<Response>
      $patch: (opts: { param: { id: string }; json: PatchSiteInput }) => Promise<Response>
      $delete: (opts: { param: { id: string } }) => Promise<Response>
      analyze: { $post: (opts: { param: { id: string } }) => Promise<Response> }
    }
  }
  return sites
}

// ── Jobs ────────────────────────────────────────────────────────────────────

export function fengJobs(client: HexastralClient) {
  return rpc(client).api.feng.jobs as {
    ':id': { $get: (opts: { param: { id: string } }) => Promise<Response> }
  }
}

// ── Declination ─────────────────────────────────────────────────────────────

export function fengDeclination(client: HexastralClient) {
  return rpc(client).api.feng.declination as {
    $get: (opts: { query: { lat: string; lng: string } }) => Promise<Response>
  }
}

// ── Map preview (facing calibrator backdrop) ───────────────────────────────

export interface MapPreviewResponse {
  base64: string
  contentType: string
  zoom: number
  size: number
}

export function fengMaps(client: HexastralClient) {
  return rpc(client).api.feng.maps as {
    preview: {
      $get: (opts: {
        query: { lat: string; lng: string; zoom?: string; size?: string }
      }) => Promise<Response>
    }
    floorplan: {
      $post: (opts: {
        json: { image: string; contentType: 'image/png' | 'image/jpeg' | 'image/webp' }
      }) => Promise<Response>
    }
  }
}

// ── Floor-plan upload (户型图) ───────────────────────────────────────────────

export interface FloorplanUploadResponse {
  key: string
}

/**
 * Upload one floor-plan image (base64) and get back its owned R2 key. base64
 * body fits the v2 HMAC (string-body) signing; the server strips EXIF/GPS.
 */
export async function uploadFloorplan(
  client: HexastralClient,
  image: string,
  contentType: 'image/png' | 'image/jpeg' | 'image/webp'
): Promise<FloorplanUploadResponse> {
  const res = await fengMaps(client).floorplan.$post({ json: { image, contentType } })
  return unwrap<FloorplanUploadResponse>(res)
}

// ── Price estimate (fair per-image tiering) ─────────────────────────────────

export interface FengPriceQuote {
  residenceType: FengResidenceType
  billingTier: 'single' | 'premium'
  productId: string
  /** Single-purchase SKU for this tier (matches server access-check). */
  singleSku: 'feng_analysis' | 'feng_analysis_premium'
  priceUsd: number
  displayPrice: string
  /** Whether this tier's report includes the street-level 形煞 pass. */
  streetView: boolean
}

export async function fengPriceEstimate(
  client: HexastralClient,
  residenceType: FengResidenceType
): Promise<FengPriceQuote> {
  const sites = rpc(client).api.feng.sites as {
    price: { $post: (opts: { json: { residenceType: FengResidenceType } }) => Promise<Response> }
  }
  const res = await sites.price.$post({ json: { residenceType } })
  const data = await unwrap<{ quote: FengPriceQuote }>(res)
  return data.quote
}

// ── Report annotated maps (F4) ──────────────────────────────────────────────

export function fengReports(client: HexastralClient) {
  return rpc(client).api.feng.reports as {
    ':reportId': {
      maps: {
        ':tile': {
          $get: (opts: {
            param: { reportId: string; tile: FengAnnotatedTile }
          }) => Promise<Response>
        }
      }
    }
  }
}

/**
 * Fetch one annotated tile (close|mid|wide) for a report. Returns the parsed
 * envelope payload — `{ tile, base64, contentType }`. Throws on `ok: false`
 * via `unwrap()`; callers should catch and surface a "rendering failed"
 * placeholder.
 */
export async function loadReportMap(
  client: HexastralClient,
  reportId: string,
  tile: FengAnnotatedTile
): Promise<FengAnnotatedMapResponse> {
  const res = await fengReports(client)[':reportId'].maps[':tile'].$get({
    param: { reportId, tile },
  })
  return unwrap<FengAnnotatedMapResponse>(res)
}

// ── Compass log (pro-tier) ──────────────────────────────────────────────────

export interface LogBearingInput {
  lat: number
  lng: number
  bearingDegTrue: number
  bearingDegMagnetic: number
  magneticDeclination: number
  label?: string
  photoR2Key?: string
}

export function compass(client: HexastralClient) {
  return rpc(client).api.compass as {
    log: { $post: (opts: { json: LogBearingInput }) => Promise<Response> }
    logs: { $get: () => Promise<Response> }
  }
}

// ── Response envelopes ─────────────────────────────────────────────────────
//
// Phase F: server now returns the shared envelope `{ ok: true, data: T, meta? }`
// or `{ ok: false, error: { code, message, details? } }`. Use `unwrap()` below
// to extract the data; callers throw on `ok: false`.

export interface ApiSuccess<T> {
  ok: true
  data: T
  meta?: { cursor?: string; total?: number; [key: string]: unknown }
}

export interface ApiError {
  ok: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export type ApiResult<T> = ApiSuccess<T> | ApiError

/**
 * Unwrap a Response into the inner data. Throws with the server's error code
 * + message if `ok: false`, or if the response itself is not 2xx.
 *
 * Use for every Phase F-migrated route:
 *
 *   const data = await unwrap<SitesListResponse>(await sites.$get())
 */
export async function unwrap<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiResult<T>
  if (!json.ok) {
    const code = json.error?.code ?? 'unknown_error'
    const message = json.error?.message ?? `Request failed (${res.status})`
    const err = new Error(message)
    ;(err as Error & { code?: string }).code = code
    throw err
  }
  return json.data
}

export interface SitesListResponse {
  sites: FengSite[]
}

export interface SiteDetailResponse {
  site: FengSite
  latestReport: FengSiteWithLatestReport['latestReport']
}

export interface SiteMutateResponse {
  site: FengSite
}

export interface AnalyzeEnqueueResponse {
  jobId: string
  siteId: string
  stage: 'maps'
  progress: 0
}

export type JobPollResponse = FengJobResponse

export interface DeclinationResponse {
  declination: number | null
  source: 'grid' | 'unknown'
  epoch: string
}
