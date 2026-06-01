# @zhop/portfolio-client

HTTP client for **`/api/portfolio/*`** — used by satellite apps for anonymous and linked readings.

## Boundary vs `@zhop/hexastral-client`

| | `portfolio-client` (this) | `hexastral-client` |
|--|---------------------------|---------------------|
| **Auth** | Anonymous install ID + HMAC device secret + optional DDL claim | Logged-in user / flagship session |
| **API shape** | `runPreview`, `runAuto`, `runLinked` per `target` slug | Hono `hc<AppType>` RPC |
| **Consumers** | Satellites | hexastral-app, yuan-app, hexastral-web |

Unifying into one client was considered and **rejected** (ADR-0005): portfolio’s anonymous session and quota errors are a different domain from flagship RPC.

## Related

- `@zhop/satellite-runtime` — HMAC, install ID, DDL resolution (used under the hood)
- `@zhop/portfolio-posters` — share card layouts (no network)
