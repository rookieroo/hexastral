# svc-mailer

Transactional email delivery service.

Responsibilities:
1. Internal email dispatch for OTP, invitations, and transactional flows.
2. Deliver via AWS SES.

## Dependencies

1. AWS SES API
2. Internal caller via service binding from `hexastral-api`

## Required Variables and Secrets

Vars:
1. `ENVIRONMENT=production`
2. `AWS_REGION`
3. `AWS_SES_FROM`

Secrets:
1. `AWS_ACCESS_KEY_ID`
2. `AWS_SECRET_ACCESS_KEY`

## Local Development

```bash
cd services/svc-mailer
bun dev
```

## Production Deployment

```bash
cd services/svc-mailer
bun deploy:prod
```

## Deployment Notes

1. Sender domain `hexastral.com` (address `noreply@hexastral.com`) must be verified in AWS SES before first send.
2. **Naming**: Cloudflare worker name is `hexastral-svc-mailer` (differs from directory `svc-mailer`). Service binding in `hexastral-api/wrangler.jsonc` must reference `"service": "hexastral-svc-mailer"`.
3. Uses `bun deploy:prod` (not `bun deploy`) — the script passes the production environment flag.
4. IAM credentials must have **only** `ses:SendEmail` permission (least privilege).
5. Keep this service internal-only — no public routes.
6. Deploy in **Wave 1** — no outbound service bindings.

## Smoke Checks

1. Send test email and verify SES accepted status.
2. Invalid payload returns explicit 4xx error.
