#!/bin/bash

# Vercel API Key 诊断脚本
# 功能：检查环境变量、验证 Google API Key、测试 Vercel 部署

set -e

echo "🔍 Vercel 环境变量诊断工具"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 检查本地环境变量
echo "📋 第 1 步：检查本地环境变量"
echo "---"

if [ -z "$GOOGLE_AI_API_KEY" ]; then
    echo -e "${RED}❌ GOOGLE_AI_API_KEY 未设置${NC}"
    echo "   请运行：export GOOGLE_AI_API_KEY='your-api-key'"
else
    KEY_LENGTH=${#GOOGLE_AI_API_KEY}
    echo -e "${GREEN}✅ GOOGLE_AI_API_KEY 已设置${NC}"
    echo "   长度：$KEY_LENGTH 字符"
    
    if [ $KEY_LENGTH -lt 30 ]; then
        echo -e "${YELLOW}⚠️  警告：API Key 看起来太短（< 30 字符），可能无效${NC}"
    fi
    
    # 显示 Key 的开头和结尾
    KEY_START="${GOOGLE_AI_API_KEY:0:5}"
    KEY_END="${GOOGLE_AI_API_KEY: -5}"
    echo "   格式预览：${KEY_START}...${KEY_END}"
fi

echo ""

# 2. 测试 Google API Key 有效性
echo "🌐 第 2 步：测试 Google API Key 有效性"
echo "---"

if [ -z "$GOOGLE_AI_API_KEY" ]; then
    echo -e "${RED}❌ 跳过：环境变量未设置${NC}"
else
    echo "发送测试请求到 Google Gemini API..."
    
    # 创建临时文件用于存储响应
    TEMP_RESPONSE=$(mktemp)
    
    # 发送请求
    HTTP_CODE=$(curl -s -w "%{http_code}" -o "$TEMP_RESPONSE" \
        -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$GOOGLE_AI_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "contents": [{"parts": [{"text": "Respond with just: OK"}]}],
            "generationConfig": {"maxOutputTokens": 10}
        }')
    
    RESPONSE_CONTENT=$(cat "$TEMP_RESPONSE")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ API Key 有效！${NC}"
        echo "   Status: $HTTP_CODE"
        
        # 尝试提取响应内容
        if echo "$RESPONSE_CONTENT" | grep -q '"text"'; then
            echo -e "${GREEN}✅ Gemini API 正常响应${NC}"
        fi
    elif [ "$HTTP_CODE" = "400" ]; then
        if echo "$RESPONSE_CONTENT" | grep -q "API key not valid"; then
            echo -e "${RED}❌ API Key 无效或已过期${NC}"
        else
            echo -e "${YELLOW}⚠️  收到 400 错误：${NC}"
        fi
        echo "   Response: $(echo $RESPONSE_CONTENT | head -c 200)"
    elif [ "$HTTP_CODE" = "429" ]; then
        echo -e "${YELLOW}⚠️  收到 429 错误（Rate Limited）${NC}"
        echo "   这意味着 Key 有效，但超过了速率限制"
    else
        echo -e "${RED}❌ 收到 $HTTP_CODE 错误${NC}"
        echo "   Response: $(echo $RESPONSE_CONTENT | head -c 200)"
    fi
    
    rm -f "$TEMP_RESPONSE"
fi

echo ""

# 3. 请求用户输入 Vercel 项目 URL
echo "🚀 第 3 步：测试 Vercel 部署（可选）"
echo "---"
read -p "请输入你的 Vercel 项目 URL（例如：https://techpulse-daily.vercel.app），或按 Enter 跳过：" VERCEL_URL

if [ -n "$VERCEL_URL" ]; then
    # 移除末尾的斜杠
    VERCEL_URL="${VERCEL_URL%/}"
    
    echo "测试 API 端点..."
    
    # 测试文本生成
    TEMP_RESPONSE=$(mktemp)
    HTTP_CODE=$(curl -s -w "%{http_code}" -o "$TEMP_RESPONSE" \
        "${VERCEL_URL}/api/ai-handler?action=text&prompt=hello")
    
    RESPONSE_CONTENT=$(cat "$TEMP_RESPONSE")
    
    if [ "$HTTP_CODE" = "200" ]; then
        if echo "$RESPONSE_CONTENT" | grep -q '"success":true'; then
            echo -e "${GREEN}✅ Vercel API 端点正常工作！${NC}"
            echo "   Status: $HTTP_CODE"
        elif echo "$RESPONSE_CONTENT" | grep -q '"success":false'; then
            echo -e "${YELLOW}⚠️  API 返回错误（但连接成功）：${NC}"
            echo "   $(echo $RESPONSE_CONTENT | jq '.error' 2>/dev/null || echo $RESPONSE_CONTENT | head -c 150)"
        fi
    elif [ "$HTTP_CODE" = "404" ]; then
        echo -e "${RED}❌ API 端点未找到（404）${NC}"
        echo "   检查：vercel.json 中的 rewrites 配置"
    elif [ "$HTTP_CODE" = "500" ]; then
        echo -e "${RED}❌ 服务器错误（500）${NC}"
        echo "   检查：Vercel 部署日志"
        if echo "$RESPONSE_CONTENT" | grep -q "GOOGLE_AI_API_KEY"; then
            echo -e "${YELLOW}↳ 提示：环境变量可能未正确配置${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  收到 $HTTP_CODE 状态码${NC}"
    fi
    
    echo "   Response Preview: $(echo $RESPONSE_CONTENT | head -c 200)..."
    rm -f "$TEMP_RESPONSE"
else
    echo "   跳过 Vercel 部署测试"
fi

echo ""
echo "================================"
echo "🎯 诊断完成！"
echo ""
echo "📝 后续步骤："
echo "1. 如果本地 API Key 有效，但 Vercel 失败："
echo "   → 检查 Vercel 控制面板的环境变量设置"
echo "   → 确保勾选了 Production、Preview、Development 所有环境"
echo "   → 点击 Redeploy（不使用缓存）"
echo ""
echo "2. 如果本地 API Key 无效："
echo "   → 获取新 Key：https://aistudio.google.com/app/apikey"
echo "   → 更新 Vercel 环境变量"
echo ""
echo "3. 更多帮助："
echo "   → 查看 VERCEL_ENV_CHECKLIST.md"
echo ""
