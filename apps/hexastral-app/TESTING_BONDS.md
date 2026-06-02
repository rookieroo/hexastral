# Resonance Bond Minimal Manual Checklist

## Preconditions

- Two test accounts: A (inviter) and B (invitee)
- B logs in with the same email used in A's invite (case-insensitive match)
- Both accounts have completed onboarding birth data

## Core Flow

1. A opens Fate tab and enters Resonance invite flow.
2. A submits invite with B email, target name, relationship label, optional message.
3. B receives invite email and opens deep link.
4. B logs in and accepts invite.
5. Verify both sides can see pair history entry.
6. Verify push/email touchpoints.

## Step Checks

### 1) A creates invite

- Path: Fate -> Resonance
- API: `POST /api/bonds/invite`
- Expect:
  - response contains `bondId`, `invitationId`, `status: "pending_invite"`, `token`
  - A bond list includes pending invite row
  - A resonance credits decremented

### 2) B receives email

- Sender path: `svc-mailer` (SES)
- Expect:
  - mail delivered to `targetEmail`
  - deep link points to bond accept route with token
  - body contains inviter, relationship, message

### 3) B opens link and authenticates

- API: `GET /api/bonds/invite/:token/info`
- Expect:
  - invitation metadata loads and renders
  - unauthenticated B is gated to login/register

### 4) B accepts

- API: `POST /api/bonds/invite/:token/respond` with `action: "accept"`
- Expect:
  - status active response with reading identifiers
  - A pending bond transitions to active
  - B mirror bond created
  - acceptance emails sent to both A and B

### 5) Push verification

- Trigger path: `sendPushEvent("bond_accepted", ...)`
- Expect:
  - A receives acceptance push
  - deep link opens bond context

## History Visibility

- A: Settings -> History -> Readings contains pair row
- B: Settings -> History -> Readings contains corresponding row
- Both can open detail view

## Edge Cases

- B logs in with different email: reject on respond
- Expired invite token: info endpoint returns 410
- A deletes invite before acceptance: invalid token and credit refund
- B declines: declined status + A notified
- B without birth data: validate graceful error or required input flow

## Known Notification Risks

- D1/KV split risk:
  - app register-device writes D1 push tokens
  - event pushes read KV token keys
  - if KV is empty, event push can no-op
- Locale fallback risk:
  - push locale lookup can fall back to zh when KV locale is missing
- Prefs gap:
  - notif prefs stored but not uniformly enforced in send paths
