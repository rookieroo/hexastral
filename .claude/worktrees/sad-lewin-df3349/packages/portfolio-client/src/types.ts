export type PortfolioTarget =
  | 'faceoracle'
  | 'starpalace'
  | 'soulmatch'
  | 'fengshui'
  | 'dreamoracle'
  | 'eightpillars'
  | 'coincast'

export interface PortfolioResponseBase {
  target: PortfolioTarget
  readingId: string
  output: Record<string, unknown>
}

export interface PortfolioPreviewResponse extends PortfolioResponseBase {
  mode: 'preview'
}

export interface PortfolioLinkedResponse extends PortfolioResponseBase {
  mode: 'linked'
  userId: string
}

export interface PortfolioRefusedResponse {
  mode: 'refused'
  target: PortfolioTarget
  reason: string
  violationCount: number
  showViolationWarning: boolean
  userId?: string
  bannedUntil?: string | null
}

export type PortfolioRunResult =
  | PortfolioPreviewResponse
  | PortfolioLinkedResponse
  | PortfolioRefusedResponse

export interface PortfolioReadingItem {
  id: string
  readingType: string
  inputJson: string
  resultJson: string
  createdAt: string
}

export interface PortfolioReadingsResponse {
  readings: PortfolioReadingItem[]
  cursor: string | null
}

export interface PortfolioReadingResponse {
  reading: PortfolioReadingItem
}

export interface RunPortfolioParams {
  target: PortfolioTarget
  input: Record<string, unknown>
  locale?: string
  /** Sent as `x-client-platform` on preview requests (native vs web Turnstile path). */
  clientPlatform?: 'ios' | 'android' | 'web'
  /**
   * When set and `input.anonymous_id` is absent, the client injects a stable install id
   * (same key as growth funnel) before calling preview/linked.
   */
  anonymousStoragePrefix?: string
}

export interface RunLinkedParams extends RunPortfolioParams {
  userId: string
}

export interface PortfolioBirthInfo {
  birthSolarDate: string
  birthTimeIndex: number
  gender?: '男' | '女'
  birthCity?: string
  birthLatitude?: string
  birthLongitude?: string
  birthTimezoneId?: string
}

export interface PortfolioBirthInfoResponse {
  birthInfo: PortfolioBirthInfo | null
}
