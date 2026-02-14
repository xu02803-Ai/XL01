# 🚨 Vercel API Key 问题 - 完整行动计划

**问题现象：** 400 Bad Request (API Key not found)  
**症状：** 路径正确、模型名正确，但 Key 没有被传递到 Google API

---

## 📞 快速开始 (3 步)

### 步骤 1: 检查 Vercel 环境变量
```
https://vercel.com/dashboard 
→ 你的项目 (XL01 或 techpulse-daily)
→ Settings 
→ Environment Variables
```

**验证清单：**
- [ ] 变量名：`GOOGLE_AI_API_KEY` (完全准确，区分大小写)
- [ ] 值：你的 30+ 字符的 API Key
- [ ] ✓️ Production 勾选
- [ ] ✓️ Preview 勾选 ⭐ (如果没勾这个，Preview 分支无法读取！)
- [ ] ✓️ Development 勾选

### 步骤 2: Redeploy (清除缓存)
```
https://vercel.com/dashboard 
→ 你的项目
→ Deployments
→ 找到最近的成功部署 (绿色 ✓)
→ 点击 ... (三个点)
→ 选择 "Redeploy"
```

**重要：** 如果出现 "Use existing Build Cache" 选项，**取消勾选它**。

**等待 2-3 分钟** 让新部署完成。

### 步骤 3: 测试
```bash
# 替换为你的实际项目 URL
curl "https://your-project.vercel.app/api/ai-handler?action=text&prompt=test"
```

**成功响应：**
```json
{"success": true, "data": "...", "model": "gemini-2.0-flash"}
```

---

## 🛠️ 诊断工具

### 工具 1: 本地 API Key 验证
```bash
# 测试 Google API Key 的有效性（无需 Vercel URL）
node test-vercel-setup.js "your-api-key-here"
```

### 工具 2: 完整诊断（包括 Vercel 测试）
```bash
# 本地诊断 + Google API 测试 + Vercel 部署测试
node test-vercel-setup.js "your-api-key-here" "https://your-project.vercel.app"
```

### 工具 3: Shell 诊断脚本
```bash
# 更详细的 Bash 脚本诊断
./diagnose-vercel-env.sh
```

**脚本会检查：**
- ✅ 本地环境变量设置
- ✅ Google API Key 有效性
- ✅ Vercel 部署可达性
- ✅ API 端点响应状态

---

## 📊 问题诊断树

### 情况 1: 本地测试 Google API Key 失败 ❌
```bash
node test-vercel-setup.js "your-key"
→ 返回: "API Key 无效或已过期"
```

**原因：** API Key 本身有问题  
**解决：**
1. 获取新 Key：https://aistudio.google.com/app/apikey
2. 在 Vercel 中更新
3. Redeploy

---

### 情况 2: Google API Key 有效 ✅，但 Vercel 仍失败 ❌
```bash
node test-vercel-setup.js "your-key" "https://your-project.vercel.app"
→ Google: ✅ 有效
→ Vercel: ❌ 500 (GOOGLE_AI_API_KEY is missing)
```

**原因：** Vercel 没有读到环境变量  
**诊断流程：**

1. **检查变量名：**
   ```
   Vercel Dashboard → Environment Variables
   确保名称是 GOOGLE_AI_API_KEY (不是 GOOGLE_API_KEY 或其他)
   ```

2. **检查环境选择：**
   ```
   确保勾选了 Production、Preview、Development
   特别是 Preview（如果只勾了 Production，Preview 分支无法读取）
   ```

3. **Redeploy 并等待：**
   ```
   Deployments → 最近部署 → ... → Redeploy
   取消勾选缓存
   等待 2-3 分钟
   ```

4. **检查部署日志：**
   ```
   Deployments → 点击部署 → Function Logs
   查找 "GOOGLE_AI_API_KEY" 或错误信息
   ```

---

### 情况 3: Vercel 收到 400 (API 报错) 🔴
```json
{
  "error": "API key not valid for this request",
  "status": 400
}
```

**这意味着：** Key 被读到了，但 Key 本身有问题  
**检查：**
- [ ] 本地测试 `node test-vercel-setup.js` 是否也失败？
- [ ] 是否超过了 API 配额？
- [ ] 是否需要在 Google Cloud Console 启用 API？

---

## 📝 代码改进检查

✅ **已完成的改进：**

1. **Handler 函数改进** (在 `/api/ai-handler.ts` 中)
```typescript
const apiKey = (process.env.GOOGLE_AI_API_KEY || '').trim();

if (!apiKey || apiKey === 'not-configured') {
  return res.status(500).json({
    success: false,
    error: 'Vercel Environment Variable GOOGLE_AI_API_KEY is missing!',
    debug: {
      hasKey: !!apiKey,
      keyLength: apiKey?.length || 0,
      allKeyVariables: Object.keys(process.env).filter(...),
      isVercel: !!process.env.VERCEL,
      vercelEnv: process.env.VERCEL_ENV
    }
  });
}
```

2. **generateText 函数改进**
```typescript
async function generateText(prompt: string, apiKey?: string) {
  const key = apiKey || (process.env.GOOGLE_AI_API_KEY || '').trim();
  
  if (!key || key === 'not-configured') {
    console.error('API Key diagnostics:', {
      hasKey: !!key,
      keyLength: key?.length || 0,
      keyStartsCorrectly: key?.startsWith('AIza') || false
    });
    throw new Error('GOOGLE_AI_API_KEY not configured');
  }
  // ...
}
```

✅ **已配置的 vercel.json：**
```json
{
  "buildCommand": "npm install && cd '每日科技脉搏 app' && npm run build",
  "outputDirectory": "每日科技脉搏 app/dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ]
}
```

---

## 🎯 优先级清单

### 必须做的 (5 分钟)
- [ ] 检查 Vercel 中 `GOOGLE_AI_API_KEY` 的名称（完全准确）
- [ ] 确保勾选了 Production、Preview、Development
- [ ] Redeploy (不使用缓存)
- [ ] 等待 2-3 分钟
- [ ] 测试 API 端点

### 如果还是失败
- [ ] 运行 `node test-vercel-setup.js "your-key"` 验证 Google API Key
- [ ] 运行 `node test-vercel-setup.js "your-key" "https://your-project.vercel.app"` 测试完整链接
- [ ] 检查 Vercel 部署日志 (Function Logs)
- [ ] 确认 `vercel.json` 的 rewrites 配置正确

### 如果仍然失败
- [ ] 检查是否超过 Google API 配额
- [ ] 尝试获取新的 API Key
- [ ] 检查 Google Cloud Console 是否启用了 Gemini API
- [ ] 查看 [VERCEL_ENV_CHECKLIST.md](./VERCEL_ENV_CHECKLIST.md)

---

## 💡 常见误解

### ❌ 误区 1: "我在本地工作就行"
Web 应用部署到 Vercel 后，环境变量配置需要重新设置。本地 .env 文件不会被同步到 Vercel。

### ❌ 误区 2: "改了环境变量就立即生效"
Vercel 需要 Redeploy 才能加载新的环境变量。仅刷新网页是不够的。

### ❌ 误区 3: "只勾选 Production 就够了"
如果你在 Preview 分支（通常是 PR）上测试，但只勾选了 Production，那么 Key 在 Preview 中无法读取。

### ❌ 误区 4: "API Key 就是那个长字符串"
Google API Key 以 `AIza` 开头，通常 39+ 个字符。如果你的看起来很短，很可能是错的。

---

## 🔍 调试技巧

### 查看完整的调试信息
当 API 返回 500 错误时，查看 JSON 响应中的 `debug` 字段：

```json
{
  "success": false,
  "error": "GOOGLE_AI_API_KEY is missing",
  "debug": {
    "hasKey": false,
    "keyLength": 0,
    "isVercel": true,
    "vercelEnv": "preview",
    "allKeyVariables": [],
    "envVarsWithGoogle": [],
    "envVarsWithAPI": []
  }
}
```

**关键指标：**
- `hasKey: false` → Key 确实没有被读到
- `isVercel: true` → 代码在 Vercel 上运行
- `vercelEnv: "preview"` → 你在预览环境上测试
- `allKeyVariables: []` → 没有任何 KEY 相关的环境变量

---

## 📞 仍需帮助？

请提供：

1. **环境变量截图**
   - 显示 Vercel 中 GOOGLE_AI_API_KEY 的设置
   - 勾选的环境（Production、Preview、Development）

2. **API 调用的完整响应**
   ```bash
   curl -v "https://your-project.vercel.app/api/ai-handler?action=text&prompt=test"
   ```

3. **诊断脚本的输出**
   ```bash
   node test-vercel-setup.js "your-key" "https://your-project.vercel.app"
   ```

4. **Vercel 部署日志**
   - Deployments → 最近部署 → Function Logs 截图

---

## 📚 参考资源

| 资源 | 链接 |
|------|------|
| Google AI Studio (获取 API Key) | https://aistudio.google.com/app/apikey |
| Vercel Settings | https://vercel.com/dashboard |
| Vercel 环境变量文档 | https://vercel.com/docs/projects/environment-variables |
| Gemini API 文档 | https://ai.google.dev/docs |
| 完整检查清单 | [VERCEL_ENV_CHECKLIST.md](./VERCEL_ENV_CHECKLIST.md) |
| 快速修复指南 | [VERCEL_QUICK_FIX.md](./VERCEL_QUICK_FIX.md) |

---

**最后更新:** 2026年2月14日  
**状态:** ✅ 所有诊断工具已准备好
