# LLM Cost & Quality Telemetry — svc-astro

Every successful LLM call emits a single structured log line:

```
[ai-router.metric] {"model":"gemini-3-pro","tier":"tier1","isPro":false,"latencyMs":3120,"inputTokens":2840,"outputTokens":612,"cachedTokens":2400,"totalTokens":3452,"fallbackDepth":0,"metricLabel":"fate-structured:incisive","locale":"zh-CN"}
```

Fields:

| Field | Description |
|---|---|
| `model` | Model identifier (e.g. `gemini-3-pro`, `deepseek-r1-distill-qwen-32b`) |
| `tier` | `tier1` \| `fallback1` \| `fallback2` \| `fallback3` |
| `isPro` | Whether the call was made on the Pro temperature/token budget |
| `latencyMs` | Wall-clock time the call took |
| `inputTokens` / `outputTokens` / `cachedTokens` / `totalTokens` | From Gemini `usageMetadata`. Missing on non-Gemini tiers. |
| `fallbackDepth` | 0 = Gemini, 3 = last-resort Llama |
| `metricLabel` | Logical caller, e.g. `fate-structured:incisive`, `fate-hooks`, `hehun-pair` |
| `locale` | Forwarded request locale |

## Step 1 — Cloudflare Logpush (one-time setup)

Create a Logpush job for the `svc-astro` Worker pointing at an R2 bucket
(or any HTTPS endpoint). Filter to keep only the metric lines:

```bash
wrangler logpush create \
  --dataset workers_trace_events \
  --destination 'r2://YOUR_BUCKET/svc-astro-metrics?account-id=...' \
  --filter '{"where":{"key":"$.Logs.Message[0]","operator":"eq","value":"[ai-router.metric]"}}'
```

Or set up via the dashboard:
- Workers & Pages → svc-astro → Logs → Add Logpush
- Dataset: `workers_trace_events`
- Filter expression: `Logs.Message contains "[ai-router.metric]"`
- Output: R2 bucket of choice (compressed NDJSON)

## Step 2 — Local quick-look via `wrangler tail`

```bash
cd services/svc-astro
wrangler tail --format=json | jq -r 'select(.logs[]?.message[0] == "[ai-router.metric]") | .logs[].message[1]'
```

## Step 3 — Aggregate (any SQL engine over R2 NDJSON)

Suggested questions and queries (DuckDB syntax — runs against R2 NDJSON directly):

### a) Daily cost driver per route

```sql
SELECT
  date_trunc('day', cf_timestamp) AS day,
  metric->>'metricLabel' AS route,
  metric->>'tier' AS tier,
  COUNT(*) AS calls,
  AVG((metric->>'latencyMs')::INT) AS avg_latency_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (metric->>'latencyMs')::INT) AS p95_latency_ms,
  SUM((metric->>'inputTokens')::INT) AS in_tokens,
  SUM((metric->>'outputTokens')::INT) AS out_tokens,
  SUM((metric->>'cachedTokens')::INT) AS cached_tokens
FROM read_ndjson_auto('s3://YOUR_BUCKET/svc-astro-metrics/*.gz')
WHERE day >= current_date - INTERVAL 7 DAY
GROUP BY 1, 2, 3
ORDER BY 1 DESC, in_tokens DESC;
```

### b) Fallback rate (quality red flag if > 5%)

```sql
SELECT
  metric->>'metricLabel' AS route,
  metric->>'isPro' AS is_pro,
  COUNT(*) FILTER (WHERE (metric->>'fallbackDepth')::INT > 0) * 1.0
    / COUNT(*) AS fallback_rate,
  COUNT(*) AS total
FROM read_ndjson_auto('s3://YOUR_BUCKET/svc-astro-metrics/*.gz')
WHERE day >= current_date - INTERVAL 1 DAY
GROUP BY 1, 2
ORDER BY fallback_rate DESC;
```

### c) Cache-hit ratio per route (Gemini implicit caching)

```sql
SELECT
  metric->>'metricLabel' AS route,
  AVG((metric->>'cachedTokens')::INT * 1.0 / NULLIF((metric->>'inputTokens')::INT, 0)) AS cache_hit_ratio,
  COUNT(*) AS samples
FROM read_ndjson_auto('s3://YOUR_BUCKET/svc-astro-metrics/*.gz')
WHERE (metric->>'tier') = 'tier1'
  AND (metric->>'inputTokens')::INT > 0
GROUP BY 1
ORDER BY cache_hit_ratio DESC;
```

## Step 4 — Pre/Post comparison (when you ship a prompt change)

Capture a baseline window (e.g. 7 days before deploy) and a post-change
window (7 days after). Compare:

| Metric | Acceptable change | Alarm threshold |
|---|---|---|
| Avg input tokens / call | within ±10% | +25% triggers review |
| p95 latency | within ±15% | +30% triggers review |
| Fallback rate | within ±2 pp | >+5 pp triggers rollback |
| Cache hit ratio (Gemini) | -5 pp acceptable when prompt changes | -20 pp = static prefix broken |

## Persona variation check

After the persona system ships, you can confirm voice variation is
shipping by counting distinct `metricLabel` suffixes:

```sql
SELECT metric->>'metricLabel' AS label, COUNT(*)
FROM read_ndjson_auto('s3://YOUR_BUCKET/svc-astro-metrics/*.gz')
WHERE day = current_date
  AND metric->>'metricLabel' LIKE 'fate-structured:%'
GROUP BY 1
ORDER BY 2 DESC;
```

You should see `fate-structured:incisive`, `fate-structured:nurturing`,
`fate-structured:playful`, `fate-structured:pragmatic`,
`fate-structured:peer`, and `fate-structured:balanced` distributed
roughly in line with the user element distribution.
