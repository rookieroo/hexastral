/**
 * Email Service Client
 *
 * Type-safe client for calling email-worker via Service Binding
 *
 * Usage:
 * ```ts
 * import { createEmailServiceClient } from '@zhop/email/service-client'
 *
 * const emailService = createEmailServiceClient(env.EMAIL_SERVICE)
 * await emailService.send({
 *   to: 'user@example.com',
 *   subject: 'Hello',
 *   html: '<h1>Welcome!</h1>'
 * })
 * ```
 */

export interface EmailServiceBinding {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>
}

export interface SendEmailRequest {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  replyTo?: string
  /** Caller identifier for logging */
  caller?: string
}

export interface SendEmailResponse {
  success: boolean
  messageId?: string
  provider?: 'resend' | 'aws-ses'
  error?: string
  blacklisted?: string[]
}

export interface SendBatchRequest {
  emails: Array<{
    to: string
    subject: string
    html?: string
    text?: string
  }>
  caller?: string
}

export interface SendBatchResponse {
  success: boolean
  summary?: {
    sent: number
    skipped: number
    failed: number
    total: number
  }
  results?: Array<{
    to: string
    success: boolean
    messageId?: string
    error?: string
    skipped?: boolean
  }>
  error?: string
}

export interface BlacklistCheckResponse {
  email: string
  blacklisted: boolean
  reason?: 'bounce' | 'complaint' | 'manual'
  bounceType?: string
  createdAt?: string
}

export interface BlacklistStatsResponse {
  total: number
  bounces: number
  complaints: number
  manual: number
}

/**
 * Type-safe Email Service Client
 */
export class EmailServiceClient {
  constructor(
    private binding: EmailServiceBinding,
    private defaultCaller?: string
  ) {}

  /**
   * Send a single email
   */
  async send(request: SendEmailRequest): Promise<SendEmailResponse> {
    const response = await this.binding.fetch('http://internal/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...request,
        caller: request.caller ?? this.defaultCaller,
      }),
    })

    return response.json()
  }

  /**
   * Send batch emails (max 100)
   */
  async sendBatch(request: SendBatchRequest): Promise<SendBatchResponse> {
    const response = await this.binding.fetch('http://internal/send-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...request,
        caller: request.caller ?? this.defaultCaller,
      }),
    })

    return response.json()
  }

  /**
   * Check if an email is blacklisted
   */
  async isBlacklisted(email: string): Promise<BlacklistCheckResponse> {
    const response = await this.binding.fetch(
      `http://internal/blacklist/check/${encodeURIComponent(email)}`
    )
    return response.json()
  }

  /**
   * Get blacklist statistics
   */
  async getBlacklistStats(): Promise<BlacklistStatsResponse> {
    const response = await this.binding.fetch('http://internal/blacklist/stats')
    return response.json()
  }

  /**
   * Add email to blacklist manually
   */
  async addToBlacklist(email: string, reason?: string): Promise<{ success: boolean }> {
    const response = await this.binding.fetch('http://internal/blacklist/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, reason }),
    })
    return response.json()
  }

  /**
   * Remove email from blacklist
   */
  async removeFromBlacklist(email: string): Promise<{ success: boolean }> {
    const response = await this.binding.fetch(
      `http://internal/blacklist/remove/${encodeURIComponent(email)}`,
      { method: 'DELETE' }
    )
    return response.json()
  }

  /**
   * Health check
   */
  async health(): Promise<{ status: string; service: string; environment: string }> {
    const response = await this.binding.fetch('http://internal/health')
    return response.json()
  }
}

/**
 * Create an Email Service Client from Service Binding
 *
 * @param binding - The EMAIL_SERVICE binding from env
 * @param defaultCaller - Default caller identifier for logging
 */
export function createEmailServiceClient(
  binding: EmailServiceBinding,
  defaultCaller?: string
): EmailServiceClient {
  return new EmailServiceClient(binding, defaultCaller)
}
