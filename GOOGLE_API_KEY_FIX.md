# ⚠️ Gemini API Key 配置问题修复

## 问题症状

```
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

这表示 Gemini API 调用失败，返回了 HTML 错误页面而不是 JSON 响应。

## 根本原因

**`GOOGLE_AI_API_KEY` 环境变量未设置或无效**

## 快速修复（5分钟）

### 步骤 1：获取 API Key（2分钟）

1. 访问 https://aistudio.google.com/app/apikey
2. 点击 **"Create API key"** 按钮
3. 选择 **"Create API key in new Google Cloud project"**
4. API Key 会自动复制到剪贴板
5. 格式通常是：`AIzaSy...` 或 `sk-...`

### 步骤 2：配置 Vercel（2分钟）

如果在 Vercel 上部署：

1. 打开 https://vercel.com/dashboard
2. 选择你的项目 **XL01**
3. 点击 **Settings** 标签
4. 左侧菜单 → **Environment Variables**
5. 点击 **Add New** 按钮
6. 填写：
   - **Name**: `GOOGLE_AI_API_KEY`
   - **Value**: 粘贴 API Key
   - **Environment**: 选择 **All** (Production, Preview, Development)
7. 点击 **Save**
8. 回到 **Deployments** 标签
9. 点击最新部署右侧的三个点 → **Redeploy**
10. 等待 2-5 分钟部署完成

### 步骤 3：验证（1分钟）

部署完成后，访问诊断端点：

```bash
curl https://your-project.vercel.app/api/diagnose
```

应该返回（关键部分）：
```json
{
  "allConfigured": true,
  "criticalIssue": false,
  "environmentVariables": {
    "GOOGLE_AI_API_KEY": {
      "exists": true,
      "value": "***set***"
    }
  }
}
```

然后测试 news 端点：
```bash
curl https://your-project.vercel.app/api/news
```

应该返回技术新闻 JSON，而不是 HTML 错误。

---

## 本地开发配置

### 创建 .env.local 文件

在项目根目录创建 `.env.local`：

```bash
cat > .env.local << EOF
GOOGLE_AI_API_KEY=your_api_key_here
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
JWT_SECRET=test_secret_123
EOF
```

### 验证配置

运行诊断脚本：

```bash
chmod +x diagnose-gemini.sh
./diagnose-gemini.sh
```

预期输出：
```
✅ GOOGLE_AI_API_KEY is set
✅ .env.local contains GOOGLE_AI_API_KEY
✅ @google/generative-ai package is installed
```

### 本地测试

```bash
npm install
npm run dev
```

访问 http://localhost:3000/api/diagnose 验证

---

## 常见问题

### Q: API Key 格式是什么？

A: Google Gemini API Key 通常以下列方式之一开头：
- `AIzaSy...` (较早的格式)
- `sk-...` (较新的格式)

长度通常 39-50 个字符。

### Q: 我没看到 "Create API key" 按钮？

A: 
1. 确保登录了 Google 账户
2. 访问 https://aistudio.google.com
3. 如果要求启用 API，点击 **Enable**
4. 然后访问 https://aistudio.google.com/app/apikey

### Q: Vercel 部署后还是报错？

A: 这是因为环境变量需要时间生效：
1. Redeploy 后，等待 **2-5 分钟**
2. 不要在 Redeploy 过程中刷新页面
3. 检查部署日志（Vercel Dashboard → Deployments → 选择部署 → Logs）

### Q: 如何确认 API Key 有效？

A: 
1. 在本地测试：`npm run dev`
2. 访问 http://localhost:3000/api/gemini?action=text&prompt=hello
3. 如果返回文本而不是 HTML 错误，API Key 有效

### Q: 错误提示 "RESOURCE_EXHAUSTED"

A: 这意味着超出了免费配额（每月 100 万 tokens）。等到月初配额重置或升级到付费版本。

---

## 调试步骤

### 1. 检查环境变量是否已设置

```bash
# 本地
echo $GOOGLE_AI_API_KEY

# Vercel 控制台
Settings → Environment Variables → 检查 GOOGLE_AI_API_KEY
```

### 2. 检查 API 诊断

```bash
# 本地
curl http://localhost:3000/api/diagnose

# Vercel
curl https://your-project.vercel.app/api/diagnose
```

查看 `criticalIssue` 和 `environmentVariables` 部分。

### 3. 查看详细日志

**本地：**
```bash
npm run dev
# 查看终端输出，找 🚀 或 ❌ 开头的日志
```

**Vercel：**
1. 打开 Vercel Dashboard
2. 选择项目 → **Logs** → **Function Logs**
3. 查看最新请求的日志

---

## 完整文件清单

需要配置的文件：

| 文件 | 是否需要修改 |
|-----|-----------|
| `api/gemini.ts` | ❌ 已配置好 |
| `api/diagnose.ts` | ❌ 已配置好 |
| `每日科技脉搏 app/api/news.ts` | ❌ 已配置好 |
| `.env.local` | ✅ 需要创建（本地开发） |
| Vercel 环境变量 | ✅ 需要配置（生产部署） |

---

## 参考资源

- 🔑 Google AI Studio API Keys: https://aistudio.google.com/app/apikey
- 📚 Gemini API 文档: https://ai.google.dev/docs
- 🚀 Vercel 环境变量: https://vercel.com/docs/projects/environment-variables
- 📖 完整迁移指南: 见 `GEMINI_MIGRATION_GUIDE.md`

---

## 如果问题仍未解决

请按以下顺序检查：

1. ✅ API Key 是否正确复制（没有空格或换行符）
2. ✅ Vercel Environment Variables 是否正确添加
3. ✅ Redeploy 是否完成（检查部署状态）
4. ✅ 等待 2-5 分钟后再测试
5. ✅ 检查 Vercel 部署日志中的错误信息

如果都不行，提供以下信息联系支持：
- 诊断端点返回的完整 JSON（`/api/diagnose`）
- 部署日志中的错误信息
- API Key 的前 10 个字符（用于验证格式）
