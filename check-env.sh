#!/bin/bash

# Vercel 环境变量检查脚本

echo "🔍 检查 Vercel 环境变量配置..."
echo ""

# 检查本地 .env 文件
if [ -f ".env" ]; then
    echo "✅ 找到 .env 文件"
    echo "检查必要变量:"
    grep -E "SUPABASE_URL|SUPABASE_SERVICE_KEY|JWT_SECRET|GEMINI_API_KEY|UNSPLASH_API_KEY|STRIPE_SECRET_KEY" .env || echo "⚠️ 某些变量未找到"
else
    echo "❌ .env 文件不存在"
    echo "请从 .env.example 复制或创建"
    exit 1
fi

echo ""
echo "🚀 Vercel 部署前检查清单:"
echo ""
echo "1. 登录 Vercel 仪表板:"
echo "   https://vercel.com/dashboard"
echo ""
echo "2. 选择项目 'XL01'"
echo ""
echo "3. 进入 Settings → Environment Variables"
echo ""
echo "4. 确保以下变量已设置:"
echo "   ☐ SUPABASE_URL"
echo "   ☐ SUPABASE_SERVICE_KEY"
echo "   ☐ JWT_SECRET"
echo "   ☐ GEMINI_API_KEY"
echo "   ☐ UNSPLASH_API_KEY"
echo "   ☐ STRIPE_SECRET_KEY"
echo "   ☐ STRIPE_BASIC_PRICE_ID"
echo "   ☐ STRIPE_PRO_PRICE_ID"
echo ""
echo "5. 重新部署或手动触发新部署"
echo ""
echo "✅ 部署后环境变量应该可用"
