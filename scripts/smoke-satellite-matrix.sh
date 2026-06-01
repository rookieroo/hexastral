#!/usr/bin/env bash
# scripts/smoke-satellite-matrix.sh
#
# Five-line smoke test: hit each Tier-1 satellite's public preview endpoint
# and verify the server responds with a reading. No HMAC, no auth — this is
# the "guest" path. For paid / linked readings, use the in-app TestFlight
# flows on a real device.
#
# Usage:
#   ./scripts/smoke-satellite-matrix.sh                # hits production
#   API=http://localhost:8787 ./scripts/smoke-satellite-matrix.sh  # local wrangler
#
# Exit codes:
#   0 — all five Tier-1 satellites returned mode=preview
#   1 — at least one failed (HTTP non-2xx, or JSON missing readingId)
#
# Locked to ADR-0006 Tier-1 set: coincast · faceoracle · dreamoracle · numerology.
# Compass is Tier 3 — no preview endpoint to test (deep-link CTA only).
# Note: faceoracle requires an image; we send a 1x1 base64 PNG placeholder
# so the route's input validation passes (vision pipeline gracefully degrades).

set -euo pipefail

API="${API:-https://api.hexastral.com}"
ANON="smoke_$(date +%s)"

fail=0
out=()

# 1x1 transparent PNG, base64 (minimal valid image — enough for vision schema to accept).
TINY_PNG_BASE64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

run() {
  local target="$1"
  local body="$2"
  local label="$3"
  local resp
  if ! resp=$(curl -sS -m 30 -X POST "$API/api/portfolio/preview/$target" \
    -H 'content-type: application/json' \
    -H 'x-client-platform: web' \
    -d "$body" 2>&1); then
    out+=("✗ $label  curl_error  $resp")
    fail=1
    return
  fi
  local mode reading_id
  mode=$(printf '%s' "$resp" | grep -o '"mode":"[^"]*"' | head -1 | sed 's/.*:"\(.*\)"/\1/')
  reading_id=$(printf '%s' "$resp" | grep -o '"readingId":"[^"]*"' | head -1 | sed 's/.*:"\(.*\)"/\1/')
  if [[ "$mode" != "preview" || -z "$reading_id" ]]; then
    out+=("✗ $label  bad_response  $resp")
    fail=1
  else
    out+=("✓ $label  $reading_id")
  fi
}

run coincast    "{\"input\":{\"question\":\"Should I move?\",\"anonymous_id\":\"$ANON\"},\"locale\":\"en\"}"  coincast
run dreamoracle "{\"input\":{\"dreamText\":\"I walked across a frozen river toward an unlit house.\",\"anonymous_id\":\"$ANON\"},\"locale\":\"en\"}" dreamoracle
run faceoracle  "{\"input\":{\"imageBase64\":\"$TINY_PNG_BASE64\",\"mode\":\"face\",\"anonymous_id\":\"$ANON\"},\"locale\":\"en\"}" faceoracle
run numerology  "{\"input\":{\"fullName\":\"Albert Einstein\",\"birthDate\":\"1879-03-14\",\"anonymous_id\":\"$ANON\"},\"locale\":\"en\"}" numerology

echo "── Smoke matrix · $API ──"
for line in "${out[@]}"; do
  echo "$line"
done

if [[ $fail -ne 0 ]]; then
  echo
  echo "Some satellites failed. Inspect responses above."
  exit 1
fi
exit 0
