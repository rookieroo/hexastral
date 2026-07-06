# @zhop/scenario-kindred

Shared logic for the Kindred (Kindred) synastry product. Consumed by:

- `apps/kindred-app` *(planned, Phase B)* — standalone Expo build
- `apps/hexastral-app` *(migration planned, see [MIGRATION.md](./MIGRATION.md))* — the Kindred Bonds tab

See [docs/decisions/0024-app-brand-naming.md](../../docs/decisions/0024-app-brand-naming.md)
and [docs/apps/yuel/status.md](../../docs/apps/yuel/status.md)
for product context.

## Setup

In your app root, wire up the client and provider:

```tsx
import { createHexastralClient } from '@zhop/hexastral-client'
import { KindredClientProvider } from '@zhop/scenario-kindred'

// Mobile (HMAC signing):
const client = createHexastralClient(API_URL, { signRequest })

// Web (Turnstile / bearer token):
const client = createHexastralClient(API_URL, { bearerToken: userId })

<KindredClientProvider client={client}>
  <App />
</KindredClientProvider>
```

Then in any descendant component:

```tsx
import { useBondInvitation, useBondList, useSynastryReport } from '@zhop/scenario-kindred'

const { invitation, isLoading, create, respond } = useBondInvitation(token)
const { bonds } = useBondList({ relationshipType: 'romantic' })
const { detail, chapters, isGenerating } = useSynastryReport(bondId)
```

## What lives here

```
src/
├── types.ts                  domain types (BondData, InvitationInfo, SynastryChapter, …)
├── context.tsx               <KindredClientProvider> + useKindredClient hook
├── hooks/
│   ├── useBondInvitation.ts  create + accept invitations (GET /info, POST /respond)
│   ├── useBondList.ts        list current user's bonds (GET /api/bonds)
│   └── useSynastryReport.ts  fetch bond detail + chapters (GET /api/bonds/:id)
└── components/
    ├── KindredSeal              cinnabar Kindred stamp (3 animation modes)
    ├── RelationshipTypeSelector  chip group
    ├── CompatibilityScore    0-100 with SVG ring
    ├── RevealMoment          2.7s ceremonial reveal after bond creation
    ├── WaitingForOther       A's pending/accepted state screen
    ├── InviteAcceptSheet     B's first-launch bottom sheet
    ├── ChapterCard           single chapter render
    ├── ChapterPager          6-chapter horizontal page-snap
    └── ShareableChapterCard  9:16 PNG for IG / 小红书 share
```

## What does NOT live here

- Routing / navigation / screen `_layout.tsx` (per-app)
- Onboarding flow screens (per-app: form-as-conversation length differs)
- Paywall + RevenueCat (per-app: product IDs differ)
- Brand-specific theme (consume `@zhop/hexastral-tokens/yuan` directly)
- Web pages (those live in `apps/hexastral-web/app/[locale]/yuan/`)

## API endpoints used

The hooks call these existing routes on `hexastral-api`:

| Hook | Method | Path |
|------|--------|------|
| `useBondInvitation(token)` (load) | GET | `/api/bonds/invite/:token/info` |
| `useBondInvitation().create(input)` | POST | `/api/bonds/invite` |
| `useBondInvitation().respond(token, input)` | POST | `/api/bonds/invite/:token/respond` |
| `useBondList()` | GET | `/api/bonds` |
| `useSynastryReport(bondId)` | GET | `/api/bonds/:id` |

Web teaser + share use two endpoints added in Phase A2:

| Consumer | Method | Path |
|----------|--------|------|
| `hexastral-web /yuan/invite/[token]/teaser` | GET | `/api/bonds/invite/:token/teaser` |
| `hexastral-web /yuan/report/[shareId]` | GET | `/api/share/yuan/:shareId` |

## Status (Phase A2)

| Surface | Status |
|---------|--------|
| Types | ✅ Aligned to hexastral-api contract |
| `KindredClientProvider` | ✅ Implemented |
| `useBondInvitation` | ✅ Wired to real RPC |
| `useBondList` | ✅ Wired to real RPC |
| `useSynastryReport` | ✅ Wired to real RPC |
| 9 components | ✅ Production-ready against tokens |
| `apps/kindred-app/` | ⏳ Phase B |
| `apps/hexastral-app` migration | ⏳ See [MIGRATION.md](./MIGRATION.md) |
| Solo bond + bond actions hooks | ⏳ Phase B (added when yuan-app needs them) |
