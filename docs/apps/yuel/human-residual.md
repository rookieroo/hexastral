# Yuun + Yuel — human residual (console / device)

Agent-completable code and docs for the 2026-07-31 pre-submit plan are done.
**Everything below requires a human** (Portal, ASC, RC, device, secrets).

SSOT links: **可执行总控台** [launch-checklist.md](../../publish/launch-checklist.md)（含控制台路径 + 文案文件链接）· [publish/README.md](../../publish/README.md) · [yuun/pre-submit-smoke.md](../yuun/pre-submit-smoke.md) · [yuel/pre-submit-smoke.md](../yuel/pre-submit-smoke.md)

---

## Console (both apps)

- [ ] Portal: Sign in with Apple on both; Yuun App Groups `group.com.hexastral.yuun`
- [ ] ASC records: Yuun Reference · Yuel Lifestyle · content rating **12+** both
- [ ] Yuun IAP: `auspice_pro_monthly` / `auspice_pro_annual` + RC entitlement `auspice_pro`
- [ ] Yuel IAP MVP (3 keys): `kindred_pro_monthly` / `kindred_pro_annual` + `hexastral_compatibility`
- [ ] Nutrition labels + 4-locale ASO + screenshots
- [ ] Fill `ascAppId` in both `eas.json`; production `appl_*` via EAS secrets
- [ ] Worker: `REVENUECAT_*`, Yuun `CYCLE_CALENDAR_SECRET`; confirm `ALLOW_DEV_PRO=0`
- [ ] Deploy API / web if pending; re-curl privacy + terms + AASA

## Device — Yuun

- [ ] Full [pre-submit-smoke.md](../yuun/pre-submit-smoke.md)
- [ ] Widget/Watch evidence matrix **or** strip ASO/screenshot Widget claims
- [ ] Delete Account smoke

## Device — Yuel (after Metro reload / rebuild)

- [ ] Full [pre-submit-smoke.md](../yuel/pre-submit-smoke.md)
- [ ] **Invite:** AirDrop HTTPS resonate → accept (not Unmatched Route)
- [ ] Carry-over from Yuun
- [ ] Delete Account

## Submit order

1. Submit **Yuun**
2. Wait **Approved**
3. Same day submit **Yuel**
