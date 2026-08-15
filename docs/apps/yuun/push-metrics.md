# Yuun push metrics — 送达/打开闭环 (可测量、可 A/B)

Status: 2026-07 · 表：`auspice_push_sends` / `auspice_push_opens`（migration **0040**）·
渲染/写入：`apps/hexastral-api/src/routes/auspice.ts` · 上报：`services/svc-notify`（outcomes）+
App（opens）· 清理：svc-notify 周日 cron。

## 数据流

```
targets 渲染 → sends 行 (status='sent', 含 body_key/variant)
  → Expo ticket → svc-notify outcomes 回填 (delivered / error)
  → 用户点击 → App 上报 open (notification_id 幂等 + bk 归因)
  → SQL: 送达率 / per-variant open rate
```

- `auspice_push_sends`：每 (device_id, date, slot) 一行，UNIQUE 幂等；slot ∈
  `daily | evening | timeline | birthday | relationship`。
- `auspice_push_opens`：每 (device_id, notification_id) 一行，UNIQUE 幂等；
  `body_key` 与 sends 的 `body_key` 关联到确切渲染。
- `data.bk`（body hash）+ `data.v`（variant 元组 `verbs:clash:extra`，en hook 路径为
  `hook`）由 `renderAuspicePush` 写进推送 payload；App 打开时原样上报。
- 本地 fallback 通知（server push 未注册的窗口期）带 `type: 'auspice_daily'|'auspice_evening'`
  → 打开同样归因 slot，但无 `bk`（无服务端渲染，不参与 variant A/B）。

## 端点

| Endpoint | Auth | 方向 |
|---|---|---|
| `POST /api/auspice/push/open` | 匿名（`/api/auspice/*` IP 限速 + per-device 日上限 20） | App → API |
| `POST /api/auspice/push/outcomes` | X-Internal-Key | svc-notify → API |
| `POST /api/auspice/push/purge-events` | X-Internal-Key（周日 cron） | svc-notify → API |

## 标准查询（D1 直查）

```sql
-- 送达率 per slot/day（过去 7 天）
SELECT date, slot, status, count(*) n
FROM auspice_push_sends
WHERE date >= date('now', '-7 days')
GROUP BY date, slot, status ORDER BY date DESC, slot;

-- 打开率 per variant（daily，device 级去重：打开设备数 / 送达设备数）
SELECT s.variant,
       count(DISTINCT s.device_id) AS sent_devices,
       count(DISTINCT o.device_id) AS opened_devices
FROM auspice_push_sends s
LEFT JOIN auspice_push_opens o
  ON o.device_id = s.device_id AND o.date = s.date AND o.slot = s.slot
WHERE s.slot = 'daily' AND s.status = 'delivered' AND s.date >= date('now', '-7 days')
GROUP BY s.variant;

-- 某变体的 device 级打开率
SELECT variant,
       ROUND(100.0 * opened_devices / sent_devices, 1) AS open_rate_pct
FROM ( …同上… ) WHERE sent_devices >= 50;   -- 样本下限，避免小样本误导

-- en hook 路径的点击（hookKey 细分）
SELECT o.date, o.body_key, count(*) opens
FROM auspice_push_opens o
WHERE o.slot = 'daily' AND o.date >= date('now', '-7 days')
GROUP BY o.date, o.body_key ORDER BY o.date DESC;
```

**判读口径（device 级优先）**：打开率用「去重设备数」而非行数——生日/关系提醒可能与
daily 同日到达，行级会稀释 daily 的归因；≥50 送达设备再下结论，避免小样本噪声。

## 周检清单（手动，pre-PMF）

1. 每个 slot 的 `sent/delivered/error` 比例 — `error` 占比突增先查 Expo 侧原因
   （`error` 详情在 sends 行的 outcomes 回填里只有 DeviceNotRegistered 等枚举，详情看 svc-notify 日志）。
2. daily 各 variant 的 device 级打开率 — 高点击 variant 的特征（动词窗口大小 / 冲煞开 /
   第三条是值神/彭祖/宿）→ 下一轮 `pushVariation` 加权候选。
3. 晚 20:00（event-driven）的打开率 vs 早 08:00 — 评估 slot 是否值得扩内容。
4. `status='sent'` 长期未回填的比例 — receipts 未就绪属正常，持续高则查 svc-notify 上报是否被拒。

## 信任边界与已知取舍

- **去标识化（隐私检查结论，2026-07）**：指标表不落原始 deviceId —— `metricsDeviceKey()`
  对 deviceId 做加盐单向哈希后入库（两张表同盐，联表不受影响）。指标无法与设备/账户
  反联，`auspice_push_subs` 里的原始 id 仍只服务于推送投递。对应 ASC 隐私标签：
  **Product Interaction — 不关联用户 — Analytics**（`app.json`
  `NSPrivacyCollectedDataTypes` 已声明该行，Linked=false），无需新增数据类型；
  DeviceID 维持原声明（AppFunctionality，供推送注册/生日提醒）。Android Play
  数据安全表口径：App activity（usage）收集、不共享 + Device or other IDs（应用功能）。
- deviceId 本身客户端自报 → 本表只做观测/A-B，**不做鉴权、不做结算**。
- receipts 未就绪时状态留 `sent`；失败上报不重试（下一个 cron 周期自然覆盖新一天）。
- 打开只统计「推送点击进入 App」，不含 App 内其他入口。
- 90 天滚动清理（周日）；隐私口径：一次性 first-party 分析，device 匿名 id 不关联账户 —
  提审前人工复核 Nutrition Labels 是否需补声明（human task）。

## 后续（数据出来后）

- `pushVariation` 变体加权（当前均匀 24 变体）。
- slot 时点实验（08:00 vs 其他）依据打开率曲线。
- 打开→次日留存漏斗（open 表 join 次日 send/register）。
