#!/bin/bash

# AI Hub 统一调度器测试脚本
# 在本地开发服务器运行时测试

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 AI Hub 统一调度器测试"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

BASE_URL="${1:-http://localhost:3000}"
echo "测试服务器: $BASE_URL"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数器
PASSED=0
FAILED=0

# 测试函数
test_endpoint() {
  local name=$1
  local method=$2
  local url=$3
  local data=$4
  
  echo -e "${YELLOW}测试: $name${NC}"
  echo "请求: $method $url"
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL$url")
  else
    response=$(curl -s -X POST -H "Content-Type: application/json" -d "$data" -w "\n%{http_code}" "$BASE_URL$url")
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    echo -e "${GREEN}✅ 成功 (HTTP $http_code)${NC}"
    echo "响应: $(echo "$body" | head -c 200)..."
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}❌ 失败 (HTTP $http_code)${NC}"
    echo "响应: $body"
    FAILED=$((FAILED + 1))
  fi
  echo ""
}

# 1. 测试新闻生成
test_endpoint \
  "生成新闻内容" \
  "GET" \
  "/api/ai-hub?type=content&dateStr=2024-01-03"

# 2. 测试图片生成
test_endpoint \
  "生成图片提示词" \
  "GET" \
  "/api/ai-hub?type=image&headline=AI突破"

# 3. 测试语音合成
test_endpoint \
  "语音合成" \
  "GET" \
  "/api/ai-hub?type=speech&text=今日科技新闻&voice=Female"

# 4. 测试模型统计 (GET)
test_endpoint \
  "获取模型统计信息" \
  "GET" \
  "/api/ai-hub?type=stats"

# 5. 测试模型统计 (POST - 重置)
test_endpoint \
  "重置模型统计信息" \
  "POST" \
  "/api/ai-hub?type=stats" \
  '{"action":"reset"}'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 测试结果"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ 通过: $PASSED${NC}"
echo -e "${RED}❌ 失败: $FAILED${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 所有测试通过！${NC}"
  exit 0
else
  echo -e "${RED}⚠️  有些测试失败。请检查 AI Hub 实现${NC}"
  exit 1
fi
