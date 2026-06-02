/**
 * @zhop/email
 *
 * Email utilities and templates.
 * Actual sending is handled by svc-mailer via Service Binding.
 * This package provides templates, utilities, and the service client.
 */

// Re-export email providers (for svc-mailer internal use)
export * from './providers'
export type { SendEmailRequest, SendEmailResponse } from './service-client'
// Re-export service client for convenience
export { createEmailServiceClient, EmailServiceClient } from './service-client'
export * from './utils/email'
