# Vercel API Key 问题快速修复指南

## 🎯 你的情况分析

状态：**400 Bad Request** (API Key not found)
- ✅ 路径正确
- ✅ 模型名正确  
- ❌ API Key 没有被 Vercel 读到

---

## ⚡ 快速修复 (5 分钟)

### 1️⃣ **Vercel 环境变量检查** (最致命的问题)

```
Vercel Dashboard 
  → 你的项目
  → Settings
  → Environment Variables
```

**检查清单：**
```
□ 变量名 = GOOGLE_AI_API_KEY (完全准确！)
□ 变量值 = 你的 API Key (从 https://aistudio.google.com/app/apikey 获取)
□ Production ✓ 勾选
□ Preview ✓ 勾选 (⚠️ 关键！否则预览分支无法读取)
□ Development ✓ 勾选
```

**常见错误：**
- `GOOGLE_API_KEY` ❌ (应该是 `GOOGLE_AI_API_KEY`)
- `google_ai_api_key` ❌ (应该全大写)
- 只勾选 Production ❌ (Preview 分支读不到！)
- 空值或过期的 Key ❌

### 2️⃣ **Redeploy 清除缓存** (Vercel 的黑魔法)

```
Vercel Dashboard
  → Deployments
  → 最近的成功部署 (绿色 ✓)
  → 点击 ... (三个点)
  → Redeploy
  → ⚠️ 取消勾选 "Use existing Build Cache" (如果有)
  → Redeploy
```

**等待 2-3 分钟**让新部署完成并启动。

### 3️⃣ **测试 API**

```bash
# 替换 your-project 为你的实际项目 URL
curl "https://your-project.vercel.app/api/ai-handler?action=text&prompt=test"
```

**预期响应 - 成功：**
```json
{
  "success": true,
  "data": "...",
  "model": "gemini-2.0-flash"
}
```

**预期响应 - Key 仍未找到：**
```json
{
  "success": false,
  "error": "Vercel Environment Variable GOOGLE_AI_API_KEY is missing or empty!",
  "debug": {
    "hasKey": false,
    "keyLength": 0,
    "allKeyVariables": []
  }
}
```

---

## 🔍 问题诊断

### 症状 1: 400 Bad Request
```
Error from Google: "API key not valid for this request"
```

**原因：** Key 被读到了，但格式错误或过期
**解决：**
1. 获取新 Key：https://aistudio.google.com/app/apikey
2. 在 Vercel 中更新
3. Redeploy

### 症状 2: 500 Server Error
```json
{
  "error": "Vercel Environment Variable GOOGLE_AI_API_KEY is missing"
}
```

**原因：** Key 根本没有被读到
**快速解决清单：**
- [ ] 变量名是 `GOOGLE_AI_API_KEY`（全大写）？
- [ ] 勾选了 Preview 环境？
- [ ] Redeploy 了？
- [ ] 等待了 2-3 分钟？

### 症状 3: 404 Not Found
```
Cannot route /api/ai-handler
```

**原因：** API 路由配置错误
**检查：** vercel.json 中的 rewrites 配置
```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ]
}
```

---

## 🛠️ 本地验证（可选但推荐）

在部署前在本地测试 API Key：

```bash
# 1. 设置环境变量
export GOOGLE_AI_API_KEY="your-api-key-here"

# 2. 验证 Key 是否有效
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$GOOGLE_AI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "Test"}]}],
    "generationConfig": {"maxOutputTokens": 10}
  }'
```

**如果返回 200 + 内容 = Key 有效 ✅**
**如果返回 400 = Key 无效或过期 ❌**

---

## 🤖 自动诊断脚本

```bash
# 在项目根目录运行
./diagnose-vercel-env.sh
```

脚本会：
- ✅ 检查本地环境变量
- ✅ 验证 Google API Key 有效性
- ✅ 测试 Vercel 部署端点
- ✅ 提供详细的诊断报告

---

## 📋 完整流程（从零开始）

### 第 1 次部署

1. **获取 API Key**
   - 访问 https://aistudio.google.com/app/apikey
   - 复制 API Key

2. **添加到 Vercel**
   - Vercel Dashboard → Settings → Environment Variables
   - 名称：`GOOGLE_AI_API_KEY`
   - 值：`paste-your-key-here`
   - ✓ Production ✓ Preview ✓ Development
   - 保存

3. **部署**
   - `git push` (自动触发 Vercel 构建)
   - 或手动 Redeploy

4. **等待并测试**
   - 等待 2-3 分钟
   - 测试 API 端点

### 如果失败

5. **检查 Redeploy**
   - Deployments → 最近部署 → ... → Redeploy
   - 取消勾选缓存
   - 等待完成

6. **检查详细 Log**
   - Deployments → 点击部署
   - 查看 Function Logs
   - 查找 "GOOGLE_AI_API_KEY" 相关的错误

7. **验证 Key 有效性**
   - 运行 `./diagnose-vercel-env.sh`
   - 检查本地是否能访问 Google API

---

## 🆘 仍然无法解决？

请提供：

1. **Vercel Environment Variables 截图**
   - 显示变量名和已勾选的环境（以及你认为可能有问题的地方）

2. **API 调用完整响应**
   ```bash
   curl -v "https://your-project.vercel.app/api/ai-handler?action=text&prompt=test" 2>&1 | head -50
   ```

3. **Vercel 部署 Log 截图**
   - Deployments → 最近部署 → Function Logs

4. **本地诊断结果**
   ```bash
   ./diagnose-vercel-env.sh
   ```

---

## 📚 参考资源

- [Google AI Studio API Key](https://aistudio.google.com/app/apikey)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Gemini API 文档](https://ai.google.dev/docs)
- [完整检查清单](./VERCEL_ENV_CHECKLIST.md)

---

## 💡 关键提示

> **"为什么我的 Key 在本地工作但在 Vercel 上不工作？"**

最常见的原因（按概率）：
1. **Preview 环境没勾选** (50%)
2. **没有点击 Redeploy** (30%)
3. **API Key 过期** (10%)
4. **变量名拼写错误** (5%)
5. **其他** (5%)

如果你的问题不在前 4 项，那很可能是第 5 项，需要更深入的调查。
