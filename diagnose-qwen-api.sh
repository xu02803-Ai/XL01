#!/bin/bash

# 千问 API 500 错误诊断和修复脚本

echo "🔍 千问 API 配置诊断"
echo "========================================"

# 1. 检查 API Key
echo ""
echo "1️⃣ 检查 API Key 环境变量..."
if [ -z "$DASHSCOPE_API_KEY" ] && [ -z "$QWEN_API_KEY" ]; then
  echo "❌ 错误: DASHSCOPE_API_KEY 或 QWEN_API_KEY 未设置"
  echo "   请在 .env.local 或 Vercel 中设置:"
  echo "   DASHSCOPE_API_KEY=sk-your-api-key"
else
  if [ -n "$DASHSCOPE_API_KEY" ]; then
    echo "✅ DASHSCOPE_API_KEY 已设置"
    echo "   长度: ${#DASHSCOPE_API_KEY} 字符"
    if [[ $DASHSCOPE_API_KEY == sk-* ]]; then
      echo "   ✅ 格式正确 (sk- 开头)"
    else
      echo "   ⚠️ 警告: 格式可能不正确 (应该以 sk- 开头)"
    fi
  fi
  if [ -n "$QWEN_API_KEY" ]; then
    echo "✅ QWEN_API_KEY 已设置"
    echo "   长度: ${#QWEN_API_KEY} 字符"
  fi
fi

# 2. 检查文件配置
echo ""
echo "2️⃣ 检查代码配置..."
echo "   检查 baseURL 配置..."
grep -n "dashscope.aliyuncs.com/compatible-mode" api/qwen-chat.ts api/qwen.ts "每日科技脉搏 app/api/news.ts" 2>/dev/null | head -5
if [ $? -eq 0 ]; then
  echo "   ✅ baseURL 配置正确"
else
  echo "   ❌ 未找到正确的 baseURL"
fi

# 3. 检查模型名称
echo ""
echo "3️⃣ 检查模型名称..."
echo "   在代码中找到的模型:"
grep -h "qwen-\|model:" api/qwen-chat.ts api/qwen.ts "每日科技脉搏 app/api/news.ts" 2>/dev/null | grep -E "qwen-plus|qwen-turbo|qwen-max|qwen-coder" | sort -u

# 4. 检查 package.json
echo ""
echo "4️⃣ 检查依赖..."
if grep -q '"openai"' package.json; then
  echo "✅ openai 包已安装"
  OPENAI_VERSION=$(grep '"openai"' package.json | head -1)
  echo "   $OPENAI_VERSION"
else
  echo "❌ openai 包未安装"
  echo "   请运行: npm install openai"
fi

# 5. 检查 .env 文件
echo ""
echo "5️⃣ 检查本地环境变量文件..."
if [ -f ".env.local" ]; then
  echo "✅ .env.local 存在"
  if grep -q "DASHSCOPE_API_KEY\|QWEN_API_KEY" .env.local; then
    echo "   ✅ 包含 API Key 配置"
  else
    echo "   ❌ 缺少 API Key 配置"
  fi
else
  echo "⚠️ .env.local 不存在"
  echo "   创建文件: echo 'DASHSCOPE_API_KEY=sk-your-key' > .env.local"
fi

# 6. 本地 API 测试
echo ""
echo "6️⃣ 建议的本地测试命令..."
echo ""
echo "如果 API 在本地运行，可以用以下命令测试:"
echo ""
echo 'curl -X POST http://localhost:3000/api/qwen-chat \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{"messages":[{"role":"user","content":"你好"}],"model":"qwen-plus"}'"'"
echo ""

# 7. 常见问题排查清单
echo ""
echo "7️⃣ 常见问题排查清单..."
echo ""
echo "□ API Key 是否正确？"
echo "  访问: https://dashscope.aliyuncs.com/user 查看和创建 API Key"
echo ""
echo "□ 模型是否已开通？"
echo "  访问: https://bailian.console.aliyun.com 查看模型状态"
echo ""
echo "□ 账户是否欠费？"
echo "  如果余额为负数，API 会被禁用"
echo ""
echo "□ baseURL 是否正确？"
echo "  应该是: https://dashscope.aliyuncs.com/compatible-mode/v1"
echo ""
echo "□ 模型名称是否正确？"
echo "  支持的模型: qwen-plus, qwen-turbo, qwen-max, qwen-coder-plus"
echo ""
echo "□ 环境变量是否生效？"
echo "  在 Vercel 中修改环境变量后，需要重新部署 (Redeploy)"
echo ""
echo "========================================"
echo "✅ 诊断完成"
