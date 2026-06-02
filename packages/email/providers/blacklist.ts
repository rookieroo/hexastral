/**
 * Email Blacklist Service for SES Bounce/Complaint Handling
 *
 * AWS SES requires monitoring bounce and complaint rates.
 * This service maintains a D1 blacklist to prevent sending to bad addresses.
 *
 * Architecture:
 * SES -> SNS -> Cloudflare Worker (Webhook) -> D1 Blacklist
 *
 * When bounce/complaint notification arrives:
 * 1. Parse SNS notification
 * 2. Add email to blacklist in D1
 * 3. Future sends check blacklist before calling SES
 */

import type { D1Database } from '@cloudflare/workers-types'

export interface BlacklistEntry {
  email: string
  reason: 'bounce' | 'complaint' | 'manual'
  bounceType?: string // Permanent, Transient
  bounceSubType?: string // General, NoEmail, Suppressed, etc.
  complaintType?: string // abuse, auth-failure, fraud, etc.
  createdAt: Date
  source?: string // SNS MessageId or manual source
}

export interface SNSNotification {
  Type: string
  MessageId: string
  TopicArn: string
  Message: string // JSON string
  Timestamp: string
  SignatureVersion: string
  Signature: string
  SigningCertURL: string
}

export interface SESBounceNotification {
  notificationType: 'Bounce'
  bounce: {
    bounceType: 'Permanent' | 'Transient'
    bounceSubType: string
    bouncedRecipients: Array<{
      emailAddress: string
      action?: string
      status?: string
      diagnosticCode?: string
    }>
    timestamp: string
    feedbackId: string
  }
  mail: {
    messageId: string
    source: string
    timestamp: string
    destination: string[]
  }
}

export interface SESComplaintNotification {
  notificationType: 'Complaint'
  complaint: {
    complainedRecipients: Array<{
      emailAddress: string
    }>
    complaintFeedbackType?: string
    timestamp: string
    feedbackId: string
  }
  mail: {
    messageId: string
    source: string
    timestamp: string
    destination: string[]
  }
}

/**
 * SQL schema for email blacklist (run this migration)
 *
 * ```sql
 * CREATE TABLE IF NOT EXISTS email_blacklist (
 *   email TEXT PRIMARY KEY,
 *   reason TEXT NOT NULL,
 *   bounce_type TEXT,
 *   bounce_sub_type TEXT,
 *   complaint_type TEXT,
 *   source TEXT,
 *   created_at INTEGER NOT NULL DEFAULT (unixepoch())
 * );
 *
 * CREATE INDEX IF NOT EXISTS idx_blacklist_reason ON email_blacklist(reason);
 * CREATE INDEX IF NOT EXISTS idx_blacklist_created ON email_blacklist(created_at);
 * ```
 */

export class EmailBlacklistService {
  constructor(private db: D1Database) {}

  /**
   * Check if an email is blacklisted
   */
  async isBlacklisted(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim()
    const result = await this.db
      .prepare('SELECT 1 FROM email_blacklist WHERE email = ?')
      .bind(normalizedEmail)
      .first()

    return result !== null
  }

  /**
   * Add an email to the blacklist
   */
  async addToBlacklist(entry: Omit<BlacklistEntry, 'createdAt'>): Promise<void> {
    const normalizedEmail = entry.email.toLowerCase().trim()

    await this.db
      .prepare(
        `INSERT OR REPLACE INTO email_blacklist 
         (email, reason, bounce_type, bounce_sub_type, complaint_type, source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        normalizedEmail,
        entry.reason,
        entry.bounceType ?? null,
        entry.bounceSubType ?? null,
        entry.complaintType ?? null,
        entry.source ?? null,
        Date.now()
      )
      .run()
  }

  /**
   * Remove an email from the blacklist (manual override)
   */
  async removeFromBlacklist(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim()
    await this.db.prepare('DELETE FROM email_blacklist WHERE email = ?').bind(normalizedEmail).run()
  }

  /**
   * Get blacklist entry details
   */
  async getBlacklistEntry(email: string): Promise<BlacklistEntry | null> {
    const normalizedEmail = email.toLowerCase().trim()
    const result = await this.db
      .prepare(
        `SELECT email, reason, bounce_type, bounce_sub_type, complaint_type, source, created_at
         FROM email_blacklist WHERE email = ?`
      )
      .bind(normalizedEmail)
      .first<{
        email: string
        reason: 'bounce' | 'complaint' | 'manual'
        bounce_type: string | null
        bounce_sub_type: string | null
        complaint_type: string | null
        source: string | null
        created_at: number
      }>()

    if (!result) return null

    return {
      email: result.email,
      reason: result.reason,
      bounceType: result.bounce_type ?? undefined,
      bounceSubType: result.bounce_sub_type ?? undefined,
      complaintType: result.complaint_type ?? undefined,
      source: result.source ?? undefined,
      createdAt: new Date(result.created_at),
    }
  }

  /**
   * Process an SNS notification from AWS SES
   *
   * Call this from your webhook handler:
   * ```ts
   * app.post('/webhooks/ses', async (c) => {
   *   const notification = await c.req.json()
   *   await blacklistService.processSNSNotification(notification)
   *   return c.json({ success: true })
   * })
   * ```
   */
  async processSNSNotification(notification: SNSNotification): Promise<void> {
    // Handle subscription confirmation
    if (notification.Type === 'SubscriptionConfirmation') {
      // Automatically confirm the subscription
      const subscribeUrl = (notification as unknown as { SubscribeURL: string }).SubscribeURL
      if (subscribeUrl) {
        await fetch(subscribeUrl)
      }
      return
    }

    if (notification.Type !== 'Notification') {
      return
    }

    const message = JSON.parse(notification.Message) as
      | SESBounceNotification
      | SESComplaintNotification

    if (message.notificationType === 'Bounce') {
      await this.processBounce(message, notification.MessageId)
    } else if (message.notificationType === 'Complaint') {
      await this.processComplaint(message, notification.MessageId)
    }
  }

  /**
   * Process a bounce notification
   */
  private async processBounce(bounce: SESBounceNotification, messageId: string): Promise<void> {
    // Only blacklist permanent bounces (hard bounces)
    // Transient bounces (soft bounces) may succeed on retry
    if (bounce.bounce.bounceType !== 'Permanent') {
      console.log('[EmailBlacklist] Ignoring transient bounce')
      return
    }

    for (const recipient of bounce.bounce.bouncedRecipients) {
      await this.addToBlacklist({
        email: recipient.emailAddress,
        reason: 'bounce',
        bounceType: bounce.bounce.bounceType,
        bounceSubType: bounce.bounce.bounceSubType,
        source: messageId,
      })
      console.log(`[EmailBlacklist] Added ${recipient.emailAddress} (bounce)`)
    }
  }

  /**
   * Process a complaint notification
   */
  private async processComplaint(
    complaint: SESComplaintNotification,
    messageId: string
  ): Promise<void> {
    for (const recipient of complaint.complaint.complainedRecipients) {
      await this.addToBlacklist({
        email: recipient.emailAddress,
        reason: 'complaint',
        complaintType: complaint.complaint.complaintFeedbackType,
        source: messageId,
      })
      console.log(`[EmailBlacklist] Added ${recipient.emailAddress} (complaint)`)
    }
  }

  /**
   * Get blacklist statistics
   */
  async getStats(): Promise<{
    total: number
    bounces: number
    complaints: number
    manual: number
  }> {
    const result = await this.db
      .prepare(
        `SELECT 
           COUNT(*) as total,
           SUM(CASE WHEN reason = 'bounce' THEN 1 ELSE 0 END) as bounces,
           SUM(CASE WHEN reason = 'complaint' THEN 1 ELSE 0 END) as complaints,
           SUM(CASE WHEN reason = 'manual' THEN 1 ELSE 0 END) as manual
         FROM email_blacklist`
      )
      .first<{
        total: number
        bounces: number
        complaints: number
        manual: number
      }>()

    return result ?? { total: 0, bounces: 0, complaints: 0, manual: 0 }
  }
}

/**
 * Create a Hono route handler for SES webhooks
 *
 * Usage:
 * ```ts
 * import { createSESWebhookHandler } from '@zhop/email/providers/blacklist'
 *
 * const app = new Hono<{ Bindings: Env }>()
 * app.post('/webhooks/ses', createSESWebhookHandler((c) => c.env.DB))
 * ```
 */
export function createSESWebhookHandler(getDb: (c: { env: { DB: D1Database } }) => D1Database) {
  return async (c: {
    env: { DB: D1Database }
    req: { json: () => Promise<SNSNotification> }
    json: (data: unknown, status?: number) => Response
  }) => {
    try {
      const notification = await c.req.json()
      const blacklistService = new EmailBlacklistService(getDb(c))
      await blacklistService.processSNSNotification(notification)
      return c.json({ success: true })
    } catch (error) {
      console.error('[SES Webhook] Error:', error)
      return c.json({ success: false, error: 'Processing failed' }, 500)
    }
  }
}
