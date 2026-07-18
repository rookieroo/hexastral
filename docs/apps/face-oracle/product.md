# Face Oracle — product spine

Post-V1 satellite. Architecture: [ADR-0028](../../decisions/0028-face-oracle-dual-track.md).

## Funnel

1. Biometric consent  
2. Three-photo wizard (left palm → right palm → face)  
3. Birth Form (Yuel/Yuun fields)  
4. Paywall (single ≥ $9.99 **or** Pro)  
5. Reading (VLM features already extracted or extracted at pay wall)

## Tracks

| | One-shot | Pro |
|---|---|---|
| SKU | `faceoracle_reading` | `faceoracle_pro_*` |
| UI | Full result once | Timeline |
| Quota | 1 credit / purchase | 6 photo slots / UTC month |
| Events | Written once | Refreshed each reading; drives push |

## Copy rules

Cultural study framing — no deterministic fate language (see ADR-0003).
