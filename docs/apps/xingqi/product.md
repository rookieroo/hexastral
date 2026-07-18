# Xingqi — product spine

Client app: [`apps/xingqi-app`](../../apps/xingqi-app). Architecture: [ADR-0028](../../decisions/0028-face-oracle-dual-track.md).

**Shell:** Yuel-quality chrome (Sign-In / BirthForm / Settings / Timeline density), assembled greenfield — not a dirty kindred rsync.  
**Display brand:** Xingqi · `com.hexastral.xingqi` · scheme `xingqi`.  
**API / RC opaque ids:** portfolio target `faceoracle`, SKUs `faceoracle_*` (unchanged server catalog).

## Funnel

1. Biometric consent  
2. Three-photo wizard (left palm → right palm → face)  
3. Birth Form (`BirthForm`, `fieldPrefix='self'`)  
4. Paywall (single ≥ $9.99 **or** Pro)  
5. Reading

## Tracks

| | One-shot | Pro |
|---|---|---|
| SKU | `faceoracle_reading` | `faceoracle_pro_*` |
| UI | Full result once | Timeline |
| Quota | 1 credit / purchase | 6 photo slots / UTC month |
| Events | Written once | Refreshed each reading; drives push |

## Copy rules

Cultural study framing — no deterministic fate language (see ADR-0003).
