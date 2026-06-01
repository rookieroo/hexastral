#!/bin/bash

# HexAstral Cloudflare 快速诊断脚本
# 用途：一键获取生产环境资源状态概览
# 
# 使用: bash scripts/debug-cloudflare.sh
# 
# 环境要求:
# - wrangler CLI 已安装
# - CLOUDFLARE_API_TOKEN 已设置
# - hexastral-api 已部署

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 HexAstral Cloudflare 诊断报告${NC}"
echo -e "${BLUE}生成时间: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo "=================================================="
echo ""

# 1. D1 数据库状态
echo -e "${YELLOW}📊 D1 数据库状态${NC}"
echo "---"

echo -n "用户总数: "
USERS_COUNT=$(wrangler d1 execute hexastral-db --remote --command "SELECT COUNT(*) as count FROM users" --format json 2>/dev/null | jq -r '.[0].count // "N/A"')
echo -e "${GREEN}$USERS_COUNT${NC}"

echo -n "今日新注册: "
TODAY_SIGNUPS=$(wrangler d1 execute hexastral-db --remote --command "SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = DATE('now')" --format json 2>/dev/null | jq -r '.[0].count // "N/A"')
echo -e "${GREEN}$TODAY_SIGNUPS${NC}"

echo -n "活跃付费用户: "
ACTIVE_PAID=$(wrangler d1 execute hexastral-db --remote --command "SELECT COUNT(*) as count FROM users WHERE is_premium = true AND last_active_at > datetime('now', '-30 days')" --format json 2>/dev/null | jq -r '.[0].count // "N/A"')
echo -e "${GREEN}$ACTIVE_PAID${NC}"

echo -n "总占卜记录: "
READINGS_COUNT=$(wrangler d1 execute hexastral-db --remote --command "SELECT COUNT(*) as count FROM readings" --format json 2>/dev/null | jq -r '.[0].count // "N/A"')
echo -e "${GREEN}$READINGS_COUNT${NC}"

echo ""

# 2. KV 存储状态
echo -e "${YELLOW}💾 KV 存储状态${NC}"
echo "---"

echo -n "GUARD_KV 键数 (限流守卫): "
GUARD_KV_COUNT=$(wrangler kv:key list --namespace-id=2d7689c0d930413390e4d20235f959a0 --limit 1000 2>/dev/null | jq '. | length' 2>/dev/null || echo "N/A")
echo -e "${GREEN}$GUARD_KV_COUNT${NC}"

echo -n "DDL_KV 键数 (深度链接会话): "
DDL_KV_COUNT=$(wrangler kv:key list --namespace-id=f46f02e4b6374cbcbee8f3faa8d7d365 --limit 1000 2>/dev/null | jq '. | length' 2>/dev/null || echo "N/A")
echo -e "${GREEN}$DDL_KV_COUNT${NC}"

echo -n "FORTUNE_CACHE 键数 (运势缓存): "
FORTUNE_CACHE_COUNT=$(wrangler kv:key list --namespace-id=3b7b3bba570d4b259543dc1f0d341a26 --limit 1000 2>/dev/null | jq '. | length' 2>/dev/null || echo "N/A")
echo -e "${GREEN}$FORTUNE_CACHE_COUNT${NC}"

echo ""

# 3. Workers 日志概览
echo -e "${YELLOW}⚡ Workers 日志（最近 50 条）${NC}"
echo "---"

# 获取日志并统计错误
echo "错误分布:"
wrangler tail hexastral-api --limit 50 --format json 2>/dev/null | jq -r '.message' | grep -o '\[ERROR\]\|ERROR\|error' | sort | uniq -c || echo "  暂无错误"

# 获取最后 5 条错误
ERRORS=$(wrangler tail hexastral-api --limit 100 --format json 2>/dev/null | jq -r 'select(.message | contains("ERROR")) | .message' | head -5)
if [ -z "$ERRORS" ]; then
  echo -e "${GREEN}✅ 最近 100 条日志中无错误${NC}"
else
  echo -e "${RED}❌ 最近的错误:${NC}"
  echo "$ERRORS" | sed 's/^/  /'
fi

echo ""

# 4. 限流状态
echo -e "${YELLOW}🚦 限流状态检查${NC}"
echo "---"

# 获取最活跃的用户 (被限流次数最多)
echo "被限流最多的用户:"
wrangler tail hexastral-api --limit 200 --format json 2>/dev/null | jq -r '.message' | grep 'RATE_LIMIT' | head -5 || echo "  暂无限流记录"

echo ""

# 5. 微服务调用统计
echo -e "${YELLOW}🔗 微服务调用统计${NC}"
echo "---"

for SERVICE in SVC_ASTRO SVC_FORTUNE SVC_NOTIFY SVC_MAILER SVC_GEOCODE; do
  COUNT=$(wrangler tail hexastral-api --limit 100 --format json 2>/dev/null | jq -r '.message' | grep -c "$SERVICE" || echo "0")
  echo "  $SERVICE: $COUNT 次调用"
done

echo ""

# 6. 快速检查清单
echo -e "${YELLOW}✓ 快速检查清单${NC}"
echo "---"

# 检查 D1 连接
echo -n "D1 连接: "
if wrangler d1 list --remote 2>/dev/null | grep -q hexastral-db; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
fi

# 检查 KV 连接
echo -n "KV 连接: "
if wrangler kv:namespace list 2>/dev/null | grep -q GUARD_KV; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
fi

# 检查 Workers 连接
echo -n "Workers 日志: "
if wrangler tail hexastral-api --limit 1 2>/dev/null | grep -q .; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
fi

echo ""

# 7. 建议行动
echo -e "${YELLOW}💡 建议行动${NC}"
echo "---"

if [ "$ACTIVE_PAID" -lt 10 ]; then
  echo "  ⚠️  活跃付费用户较少 (< 10)，建议检查订阅流程"
fi

if [ "$GUARD_KV_COUNT" -gt 10000 ]; then
  echo "  ⚠️  GUARD_KV 键数过多 (> 10000)，建议清理过期键"
fi

if [ ! -z "$ERRORS" ]; then
  echo "  ⚠️  检测到最近的错误，建议查看详细日志"
fi

echo ""
echo -e "${GREEN}✅ 诊断完成${NC}"
echo "=================================================="
echo ""
echo "📚 更多信息:"
echo "  - 详细日志: wrangler tail hexastral-api"
echo "  - D1 查询: wrangler d1 execute hexastral-db --remote --command \"SELECT ...\""
echo "  - KV 检查: wrangler kv:key get --namespace-id=... <key>"
echo "  - 部署历史: wrangler deployments list hexastral-api"
