# Architecture Decisions — 索引与历史编号映射

> **现状（2026-08）**：本目录只保留两篇 ADR 原文（`0003-portfolio-voice-compliance.md`、
> `0028-face-oracle-dual-track.md`）。0001–0027 的原文文件已从仓库移除——决策结论
> 已经内化到各 per-app 文档（`docs/apps/*/`）、`docs/publish/` 与代码注释里。
> 文档中的裸编号（如 "ADR-0024"）按下表定位结论，不再有可点击链接。

## 保留的 ADR

| ADR | 主题 | 位置 |
|---|---|---|
| 0003 | Portfolio voice & compliance（非预测、非医疗、无 fatalism） | `docs/decisions/0003-portfolio-voice-compliance.md` |
| 0028 | Syel 双轨 + 三源漏斗（display Syel；API `faceoracle`） | `docs/decisions/0028-face-oracle-dual-track.md` |

## 历史编号映射（结论落点）

| 编号 | 主题 | 结论现在在哪里 |
|---|---|---|
| 0004 | Satellite funnel pattern | `docs/setup/satellite-funnel-wiring.md` |
| 0005 | Package boundaries | 根 `.cursorrules` §4 + 各 `packages/*/README.md` |
| 0008 | 三层架构规则 | `docs/shared/birth-info-form-spec.md`（birth-info 落地为 `@zhop/core-ui`） |
| 0009 | Two-layer matrix（omnibus 退役） | AGENTS.md house rules（hexastral-app = retired） |
| 0010 | Yuun (cycle) satellite | `docs/apps/yuun/launch.md` + `ia-today-first.md` |
| 0012 | Freemium matrix | `docs/setup/revenuecat-entitlements.md`（per-app Pro） |
| 0013 | IAP system architecture | 同上 + `apps/hexastral-api/src/config/products.ts`（SSOT） |
| 0014 | Yuel bonds timeline | `docs/apps/yuel/bonds-timeline-plan.md` |
| 0018 | Ink Brutalism design language | `docs/apps/yuun/copy-voice.md` + 设计资产 `docs/design/` |
| 0019 | V1 wave scope（Yuun→Yuel 提审顺序） | `docs/publish/README.md` + `launch-checklist.md` |
| 0020 | Yuun life timeline & glossary | `docs/apps/yuun/launch.md`（timeline / glossary） |
| 0021 | Yuel solo-first mingpan frame | `docs/apps/yuel/status.md` |
| 0023 | Timeline make-if insight layer | `docs/apps/yuun/timeline-makeif-gitgraph.md` |
| 0024 | Yuun/Yuel 品牌命名 | `docs/publish/brand-aso-gtm-plan.md`（bundle IDs 冻结 `com.hexastral.{yuel,yuun}`） |
| 0025 | Yuel relationship push | `docs/setup/push-retention-playbook.md` |
| 0026 | Make-if altitude split | `docs/apps/yuun/timeline-makeif-gitgraph.md` |
| 0027 | Bond credit & locale economy | `docs/apps/yuel/bonds-timeline-plan.md` |

## 惯例

- 写新 ADR：只在「跨 app 的结构性决策」时写，放进本目录并在此索引登记。
- 引用旧 ADR：直接写裸编号（`ADR-0019`），读者按上表找落点；不要再建失效链接。
