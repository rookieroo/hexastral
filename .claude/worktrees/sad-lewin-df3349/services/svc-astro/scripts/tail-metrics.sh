#!/usr/bin/env bash
# Live-tail svc-astro and only print the [ai-router.metric] JSON payloads,
# one per line. Pipe to jq / duckdb / a file for ad-hoc analysis.
#
# Usage:
#   ./scripts/tail-metrics.sh                              # local wrangler dev
#   ./scripts/tail-metrics.sh --env=production             # production worker
#   ./scripts/tail-metrics.sh | jq -s 'group_by(.metricLabel)
#       | map({label: .[0].metricLabel,
#              n: length,
#              avg_in: (map(.inputTokens // 0) | add / length),
#              avg_latency: (map(.latencyMs) | add / length)})'
#
set -euo pipefail
cd "$(dirname "$0")/.."
exec wrangler tail "$@" --format=json \
  | jq -r '.logs[]?.message | select(.[0] == "[ai-router.metric]") | .[1]'
