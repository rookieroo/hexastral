# Syel (Xingqi) — launch checklist（骨架）

> **Status**: next after Yuel（`com.hexastral.syel` · `apps/xingqi-app`）。
> 正式 Submit：**Yuun + Yuel 过审之后单独提**，不要与 Yuel 同日塞队。Kanyu / Yaul / Lantai 让路。
> 首页视觉样板：[home-ui-mock.html](./home-ui-mock.html)。代码侧可并行准备控制台（见 [publish/README.md](../../publish/README.md)）。

**产品**：面相/手相三源（L/R 掌 + 脸）+ 生辰必填（ADR-0028）。产品脊柱见 [product.md](./product.md)。

## 已知阻塞（human）

- [ ] EAS `projectId` 仍为 `REPLACE_*`（`apps/xingqi-app/eas.json`）
- [ ] 缺 `@react-native-google-signin/google-signin` 直接依赖（`app/sign-in.tsx:88` 引用，typecheck 失败）
- [ ] RevenueCat：entitlement `faceoracle_pro` + offering（见 [revenuecat-entitlements.md](../../setup/revenuecat-entitlements.md)）
- [ ] ASC 建 App 记录（类别、12+、四语 ASO、隐私标签）——参照 [launch-checklist.md](../../publish/launch-checklist.md)（Yuun/Yuel 两列之外同样走一遍）
- [ ] 截图 + 真机回归（[regression-checklist.md](./regression-checklist.md)）

## 提审顺序

Yuun Approved → 同日 Yuel → 之后单独提 Syel（勿与 Yuel 同日同塞审核队列）。
