#!/bin/bash

# Gemini API Key 配置诊断脚本

echo "🔍 Gemini API Configuration Diagnostic"
echo "======================================"
echo ""

# 检查 API Key 是否在环境变量中
if [ -z "$GOOGLE_AI_API_KEY" ]; then
    echo "❌ GOOGLE_AI_API_KEY not found in environment variables"
    echo ""
    echo "How to fix:"
    echo "1. Get API Key from: https://aistudio.google.com/app/apikey"
    echo "2. Set it in your environment:"
    echo "   export GOOGLE_AI_API_KEY=your_key_here"
    echo ""
    echo "For Vercel deployment:"
    echo "1. Go to Vercel Dashboard → Project Settings → Environment Variables"
    echo "2. Add: GOOGLE_AI_API_KEY = your_key_here"
    echo "3. Click 'Save'"
    echo "4. Redeploy your project"
else
    echo "✅ GOOGLE_AI_API_KEY is set"
    # Show masked key
    KEY_LENGTH=${#GOOGLE_AI_API_KEY}
    MASKED_KEY="sk-${GOOGLE_AI_API_KEY:5:10}...${GOOGLE_AI_API_KEY: -10}"
    echo "   Key (masked): $MASKED_KEY"
    echo "   Length: $KEY_LENGTH characters"
fi

echo ""
echo "Check .env.local file:"
if [ -f ".env.local" ]; then
    if grep -q "GOOGLE_AI_API_KEY" .env.local; then
        echo "✅ .env.local contains GOOGLE_AI_API_KEY"
    else
        echo "❌ .env.local exists but doesn't contain GOOGLE_AI_API_KEY"
    fi
else
    echo "⚠️  .env.local file not found"
fi

echo ""
echo "Check .env file:"
if [ -f ".env" ]; then
    if grep -q "GOOGLE_AI_API_KEY" .env; then
        echo "✅ .env contains GOOGLE_AI_API_KEY"
    else
        echo "❌ .env exists but doesn't contain GOOGLE_AI_API_KEY"
    fi
else
    echo "⚠️  .env file not found"
fi

echo ""
echo "Installation status:"
if npm list @google/generative-ai 2>/dev/null | grep -q "@google/generative-ai"; then
    echo "✅ @google/generative-ai package is installed"
else
    echo "❌ @google/generative-ai package NOT installed"
    echo "   Run: npm install @google/generative-ai"
fi

echo ""
echo "======================================"
echo "Next steps:"
echo "1. Get API Key: https://aistudio.google.com/app/apikey"
echo "2. Create/update .env.local:"
echo "   echo 'GOOGLE_AI_API_KEY=your_key_here' > .env.local"
echo "3. Test locally: npm run dev"
echo "4. Check endpoint: curl http://localhost:3000/api/diagnose"
echo ""
