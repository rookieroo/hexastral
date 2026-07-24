# Post–bundle-rename Portal Checklist

> After `com.hexastral.{yuel,yuun,kanyu,yaul,syel}` (2026-07).  
> **Do not** create App IDs under old engineering suffixes (`kindred` / `auspice` / `feng` / `coincast` / `xingqi`).  
> Directory names + RC product/entitlement **ids** stay engineering (`kindred_pro`, `faceoracle_*`, …).

Related: [README.md](./README.md) · [yuun-yuel-launch-runbook.md](./yuun-yuel-launch-runbook.md) · [asc-yuun-yuel-guide.md](./asc-yuun-yuel-guide.md)

---

## Bundle matrix

| Brand | Directory | Bundle / package | Scheme | App Group | Privacy (ASC) | Terms |
|---|---|---|---|---|---|---|
| **Yuun** | `apps/auspice-app` | `com.hexastral.yuun` | `yuun` | `group.com.hexastral.yuun` | `yuun.hexastral.com/<seg>/privacy/yuun` | `…/terms` |
| **Yuel** | `apps/kindred-app` | `com.hexastral.yuel` | `yuel` | — | `yuel.hexastral.com/<seg>/privacy/yuel` | `…/terms` |
| **Kanyu** | `apps/feng-app` | `com.hexastral.kanyu` | `kanyu` | — | `kanyu.hexastral.com/<seg>/privacy/kanyu` | `…/terms` |
| **Yaul** | `apps/coin-cast-app` | `com.hexastral.yaul` | `yaul` | — | `yaul.hexastral.com/<seg>/privacy/yaul` | `…/terms` |
| **Syel** | `apps/xingqi-app` | `com.hexastral.syel` | `syel` | — | `syel.hexastral.com/<seg>/privacy/syel` | `…/terms` |

`<seg>` = `en` \| `zh` \| `tw` \| `ja` (`localePrefix: as-needed`; English may omit segment).

Legacy privacy paths 301 → brand (`kindred→yuel`, `auspice→yuun`, `feng→kanyu`, `coincast→yaul`, `xingqi|faceoracle→syel`).

---

## Per-bundle console checklist

Repeat for **each** row above.

### Apple Developer

- [ ] Register App ID = brand Bundle ID
- [ ] Enable **Sign in with Apple**
- [ ] Associated Domains (match `app.json` `associatedDomains`)
- [ ] Yuun only: App Group `group.com.hexastral.yuun` (+ widget extension when shipping)
- [ ] Regenerate provisioning profiles after capabilities

### App Store Connect

- [ ] Create app record on the **new** Bundle ID
- [ ] Privacy Policy URL + Terms URL (brand paths in matrix)
- [ ] Paste `ascAppId` into that app’s `eas.json` submit config

### Google Cloud (if Google Sign-In ships)

- [ ] **One iOS OAuth client per Bundle** (do not share Yuun/Kanyu clients)
- [ ] Put iOS + web client ids in app env (`EXPO_PUBLIC_GOOGLE_*`)
- [ ] Append iOS client ids to API `GOOGLE_OAUTH_AUDIENCES` (wrangler var / secret)

### RevenueCat

- [ ] Attach store app to the **new** Bundle ID
- [ ] Keep existing product / entitlement **string ids** (`auspice_pro`, `kindred_pro`, `faceoracle_*`, `coincast_*`, …)

### EAS

- [ ] Credentials / distribution cert for the new Bundle
- [ ] Production profile build + TestFlight after ASC record exists

---

## Deploy gate (code already on `main`)

After this checklist is in progress, production must serve new Apple `aud`, AASA `appID`, and privacy keys:

```bash
cd apps/hexastral-api && bun deploy
cd apps/hexastral-web && bun deploy
# optional (Telegram admin alerts):
cd services/svc-admin-notify && bun deploy
```

Smoke:

```bash
curl -sI https://yuel.hexastral.com/en/privacy/yuel | head -3
curl -sI https://yuel.hexastral.com/en/privacy/kindred | head -5
curl -s https://www.hexastral.com/.well-known/apple-app-site-association | head
```
