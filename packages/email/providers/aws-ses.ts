/**
 * AWS SES Client for Cloudflare Workers
 *
 * Uses AWS SDK v3 (@aws-sdk/client-ses) - the official, maintained solution.
 * SDK v3 is modular and works well with Cloudflare Workers.
 *
 * IAM Policy (Least Privilege):
 * ```json
 * {
 *   "Version": "2012-10-17",
 *   "Statement": [{
 *     "Effect": "Allow",
 *     "Action": ["ses:SendEmail", "ses:SendRawEmail"],
 *     "Resource": "arn:aws:ses:REGION:ACCOUNT:identity/your-domain.com"
 *   }]
 * }
 * ```
 *
 * Environment Variables (use `wrangler secret put`):
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_REGION (e.g., us-east-1)
 * - AWS_SES_FROM (verified sender address)
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

export interface SESConfig {
  accessKeyId: string
  secretAccessKey: string
  region: string
  /** Verified sender address - MUST be hardcoded, never from user input */
  defaultFrom?: string
}

export interface SendEmailParams {
  to: string | string[]
  /** Override sender (must be verified in SES) */
  from?: string
  subject: string
  html?: string
  text?: string
  replyTo?: string | string[]
}

export interface SendEmailResult {
  messageId: string
}

/**
 * AWS SES Client wrapper using official SDK v3
 */
export class AWSSESClient {
  private client: SESClient
  private defaultFrom?: string

  constructor(config: SESConfig) {
    this.client = new SESClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
    this.defaultFrom = config.defaultFrom
  }

  /**
   * Send an email via AWS SES
   *
   * Security notes:
   * - Source (from) should be hardcoded, not from user input
   * - Subject should be from allowlist for sensitive operations (OTP, etc.)
   * - Always validate recipient email format before calling
   */
  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    const from = params.from ?? this.defaultFrom
    if (!from) {
      throw new Error('From address is required (must be verified in SES)')
    }

    const toAddresses = Array.isArray(params.to) ? params.to : [params.to]
    const replyToAddresses = params.replyTo
      ? Array.isArray(params.replyTo)
        ? params.replyTo
        : [params.replyTo]
      : undefined

    const command = new SendEmailCommand({
      Source: from,
      Destination: {
        ToAddresses: toAddresses,
      },
      Message: {
        Subject: { Data: params.subject, Charset: 'UTF-8' },
        Body: {
          ...(params.html && {
            Html: { Data: params.html, Charset: 'UTF-8' },
          }),
          ...(params.text && {
            Text: { Data: params.text, Charset: 'UTF-8' },
          }),
        },
      },
      ...(replyToAddresses && { ReplyToAddresses: replyToAddresses }),
    })

    const result = await this.client.send(command)

    return { messageId: result.MessageId ?? 'unknown' }
  }

  /**
   * Destroy the client (cleanup)
   */
  destroy(): void {
    this.client.destroy()
  }
}

/**
 * Create an AWS SES client from environment variables
 *
 * Environment setup:
 * ```bash
 * npx wrangler secret put AWS_ACCESS_KEY_ID
 * npx wrangler secret put AWS_SECRET_ACCESS_KEY
 * npx wrangler secret put AWS_REGION
 * npx wrangler secret put AWS_SES_FROM
 * ```
 */
export function createSESClient(env: {
  AWS_ACCESS_KEY_ID?: string
  AWS_SECRET_ACCESS_KEY?: string
  AWS_REGION?: string
  AWS_SES_FROM?: string
}): AWSSESClient | null {
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    return null
  }

  return new AWSSESClient({
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION ?? 'us-east-1',
    defaultFrom: env.AWS_SES_FROM,
  })
}
