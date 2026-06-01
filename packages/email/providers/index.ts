/**
 * Unified Email Provider Interface
 * 
 * Supports:
 * - Resend (recommended, built on AWS SES)
 * - AWS SES Direct (via HTTP API)
 * 
 * Usage:
 * ```ts
 * const emailProvider = createEmailProvider(env)
 * await emailProvider.send({
 *   to: 'user@example.com',
 *   subject: 'Hello',
 *   html: '<h1>Welcome!</h1>'
 * })
 * ```
 */

import { Resend, type CreateEmailOptions } from 'resend'
import { AWSSESClient, createSESClient } from './aws-ses'

export interface EmailMessage {
  to: string | string[]
  from?: string
  subject: string
  html?: string
  text?: string
  replyTo?: string | string[]
}

export interface EmailSendResult {
  id: string
  provider: 'resend' | 'aws-ses'
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailSendResult>
  readonly provider: 'resend' | 'aws-ses'
}

/**
 * Resend email provider
 */
export class ResendProvider implements EmailProvider {
  readonly provider = 'resend' as const
  private client: Resend
  private defaultFrom: string

  constructor(apiKey: string, defaultFrom: string) {
    this.client = new Resend(apiKey)
    this.defaultFrom = defaultFrom
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const to = Array.isArray(message.to) ? message.to : [message.to]

    const payload: CreateEmailOptions = {
      from: message.from ?? this.defaultFrom,
      to,
      subject: message.subject,
      html: message.html ?? '',
      text: message.text,
      replyTo: message.replyTo
        ? Array.isArray(message.replyTo)
          ? message.replyTo
          : [message.replyTo]
        : undefined,
    }
    const result = await this.client.emails.send(payload)

    if (result.error) {
      throw new Error(`Resend error: ${result.error.message}`)
    }

    return {
      id: result.data?.id ?? 'unknown',
      provider: 'resend',
    }
  }
}

/**
 * AWS SES email provider
 */
export class AWSSESProvider implements EmailProvider {
  readonly provider = 'aws-ses' as const
  private client: AWSSESClient

  constructor(client: AWSSESClient) {
    this.client = client
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const result = await this.client.sendEmail({
      to: message.to,
      from: message.from,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
    })

    return {
      id: result.messageId,
      provider: 'aws-ses',
    }
  }
}

export interface EmailProviderConfig {
  // Resend
  RESEND_API_KEY?: string
  RESEND_FROM?: string
  // AWS SES
  AWS_ACCESS_KEY_ID?: string
  AWS_SECRET_ACCESS_KEY?: string
  AWS_REGION?: string
  AWS_SES_FROM?: string
}

/**
 * Create an email provider from environment variables
 * Priority: Resend > AWS SES
 */
export function createEmailProvider(env: EmailProviderConfig): EmailProvider {
  // Try Resend first (simpler, recommended)
  if (env.RESEND_API_KEY && env.RESEND_FROM) {
    return new ResendProvider(env.RESEND_API_KEY, env.RESEND_FROM)
  }

  // Fall back to AWS SES
  const sesClient = createSESClient(env)
  if (sesClient) {
    return new AWSSESProvider(sesClient)
  }

  throw new Error(
    'No email provider configured. Set RESEND_API_KEY/RESEND_FROM or AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/AWS_SES_FROM'
  )
}

// Re-export
export { AWSSESClient, createSESClient } from './aws-ses'
export { EmailBlacklistService, createSESWebhookHandler } from './blacklist'
export type {
  BlacklistEntry,
  SNSNotification,
  SESBounceNotification,
  SESComplaintNotification,
} from './blacklist'
