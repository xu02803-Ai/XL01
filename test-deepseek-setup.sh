#!/bin/bash

# DeepSeek API 配置测试脚本
# 用于验证 DEEPSEEK_API_KEY 环境变量配置

echo "======================================"
echo "DeepSeek API 配置验证"
echo "======================================"
echo ""

# 检查环境变量是否设置
if [ -z "$DEEPSEEK_API_KEY" ]; then
    echo "❌ 错误：DEEPSEEK_API_KEY 环境变量未设置"
    echo ""
    echo "解决方案："
    echo "1. 在 .env 文件中添加："
    echo "   export DEEPSEEK_API_KEY=sk-your-api-key"
    echo ""
    echo "2. 或在命令行中设置："
    echo "   export DEEPSEEK_API_KEY=sk-your-api-key"
    echo ""
    echo "3. 然后重新运行此脚本"
    exit 1
else
    echo "✅ DEEPSEEK_API_KEY 已设置"
    
    # 检查格式
    if [[ $DEEPSEEK_API_KEY == sk-* ]]; then
        echo "✅ API Key 格式正确（以 'sk-' 开头）"
    else
        echo "⚠️  警告：API Key 不以 'sk-' 开头，可能格式不正确"
    fi
fi

echo ""
echo "======================================"
echo "环境信息"
echo "======================================"
echo "Node.js 版本: $(node --version)"
echo "npm 版本: $(npm --version)"
echo "当前目录: $(pwd)"
echo ""

# 检查必要的文件
echo "======================================"
echo "文件检查"
echo "======================================"

files=(
    "api/ai-handler.ts"
    "package.json"
    "每日科技脉搏 app/services/geminiService.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (缺失)"
    fi
done

echo ""
echo "======================================"
echo "依赖检查"
echo "======================================"

# 检查必要的依赖是否在 package.json 中
if grep -q "@google/generative-ai" package.json; then
    echo "⚠️  警告：package.json 仍包含 @google/generative-ai，请运行 npm install"
fi

if grep -q "@google/genai" package.json; then
    echo "⚠️  警告：package.json 仍包含 @google/genai，请运行 npm install"
fi

if grep -q "supabase" package.json; then
    echo "✅ @supabase/supabase-js 已安装"
fi

echo ""
echo "======================================"
echo "下一步"
echo "======================================"
echo "1. 确保 DEEPSEEK_API_KEY 环境变量已设置"
echo "2. 运行 npm install 更新依赖"
echo "3. 启动应用并测试 API"
echo ""
echo "测试文本生成 API:"
echo "  curl 'http://localhost:3000/api/ai-handler?action=text&prompt=Hello'"
echo ""
echo "测试图片生成 API:"
echo "  curl 'http://localhost:3000/api/ai-handler?action=image&headline=News'"
echo ""
