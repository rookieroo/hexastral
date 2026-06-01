# Migration: hexastral-app `(bonds)/` → scenario-yuan

This document describes how `apps/hexastral-app/app/(bonds)/` will eventually
consume `@zhop/scenario-yuan` instead of the legacy `lib/domain/bonds.ts`
client. It is deferred from Phase A2 because:

1. The existing screens (bond-create, bond-accept, bond-detail, etc.) are
   deeply integrated with hexastral-app's theme, navigation, and HMAC signer.
2. There is no second consumer (yuan-app) yet to validate the package shape.
3. The existing API client (`lib/domain/bonds.ts`) already works.

The migration becomes valuable once `apps/yuan-app/` is created in Phase B —
at that point we need both apps to share the same hooks and types.

## What's already aligned

After Phase A2, the following are guaranteed compatible:

| Concept | scenario-yuan export | hexastral-app legacy |
|---------|---------------------|----------------------|
| Bond list type | `BondData` | `BondData` (lib/domain/bonds.ts) — same shape |
| Bond detail | `BondDetailData` | `BondDetailData` — same shape |
| Invitation create | `useBondInvitation().create(input)` | `sendResonanceInvite(userId, input)` |
| Invitation respond | `useBondInvitation().respond(token, input)` | `respondToInvite(userId, token, input)` |
| Invitation info | `useBondInvitation(token).invitation` | `fetchInvitationInfo(userId, token)` |
| List bonds | `useBondList()` | `fetchBonds(userId)` |
| Bond detail | `useSynastryReport(bondId).detail` | (custom fetch in bond-detail.tsx) |

The legacy client signs requests with HMAC; the new hooks receive a pre-signed
`HexastralClient` via context. **Same wire format — just different in-process
plumbing.**

## Suggested migration steps

### Step 1 — Wire YuanClientProvider into hexastral-app

In `apps/hexastral-app/app/_layout.tsx`:

```tsx
import { createHexastralClient } from '@zhop/hexastral-client'
import { YuanClientProvider } from '@zhop/scenario-yuan'
import { signRequest } from '@/lib/hmac'
import { config } from '@/lib/config'

const yuanClient = createHexastralClient(config.apiUrl, {
  signRequest: async (method, path, body) => {
    const sig = await signRequest({ method, path, body, userId: currentUserId })
    return sig ?? {}
  },
})

// Wrap the existing tree
<YuanClientProvider client={yuanClient}>
  {/* existing tabs */}
</YuanClientProvider>
```

### Step 2 — Replace one hook at a time

Start with **`useBondList`** (lowest blast radius — it's just a list query).
In the bonds tab screen:

```tsx
// Before
import { fetchBonds } from '@/lib/domain/bonds'
const bonds = useQuery({ queryKey: ['bonds'], queryFn: () => fetchBonds(userId) })

// After
import { useBondList } from '@zhop/scenario-yuan'
const { bonds, isLoading, error } = useBondList()
```

Verify the bonds tab still renders identically. Then move on.

### Step 3 — Replace the rest

Order of progressive replacement (each is an independent PR):

1. `bond-leaderboard.tsx` → consume `useBondList()`
2. `bond-detail.tsx` → consume `useSynastryReport(bondId)`
3. `bond-accept.tsx` → consume `useBondInvitation(token)` + `.respond()`
4. `bond-create.tsx` (resonance mode) → consume `useBondInvitation().create()`
5. `bond-create.tsx` (solo mode) — needs a new `useSoloBond` hook (add it then)

### Step 4 — Delete legacy `lib/domain/bonds.ts`

Once all screens are migrated, delete the old file. Keep its tests if any.

### Step 5 — Adopt shared components (optional)

The bond list / detail screens can also adopt scenario-yuan components:

- `CompatibilityScore` for the score ring
- `RelationshipTypeSelector` for the relationship chip group
- `ChapterPager` + `ChapterCard` for the report when v2 chapter format ships
- `ShareableChapterCard` for the share affordance

Each component swap is a separate PR. None is blocking the hook migration.

## Compatibility table

| Legacy fn / type | scenario-yuan equivalent | Wire format |
|---|---|---|
| `BondData` | `BondData` (from `@zhop/scenario-yuan`) | identical |
| `BondDetailData` | `BondDetailData` | identical |
| `fetchBonds(userId)` | `useBondList()` | same `GET /api/bonds` |
| `fetchBondCredits(userId)` | `useBondCredits()` *(not yet built — Phase B)* | `GET /api/bonds/credits` |
| `createSoloBond(userId, input)` | `useSoloBond()` *(not yet built — Phase B)* | `POST /api/bonds/solo` |
| `sendResonanceInvite(userId, input)` | `useBondInvitation().create(input)` | same `POST /api/bonds/invite` |
| `fetchInvitationInfo(userId, token)` | `useBondInvitation(token)` returns `invitation` | same `GET /api/bonds/invite/:token/info` |
| `respondToInvite(userId, token, input)` | `useBondInvitation().respond(token, input)` | same `POST /api/bonds/invite/:token/respond` |
| `deleteBond(userId, bondId)` | `useBondActions().remove(bondId)` *(not yet built)* | `DELETE /api/bonds/:id` |
| `updateBond(userId, bondId, patch)` | `useBondActions().update(bondId, patch)` *(not yet built)* | `PATCH /api/bonds/:id` |
| `updateBondStage(userId, bondId, stage)` | `useBondActions().updateStage(bondId, stage)` *(not yet built)* | `PATCH /api/bonds/:id/stage` |

The "not yet built" hooks are scoped for Phase B when `apps/yuan-app/` lands —
it will dictate exactly which surface yuan-app needs and we'll fill them in.
