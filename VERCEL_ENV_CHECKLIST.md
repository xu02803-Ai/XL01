# Vercel 环境变量 "死亡核对" 清单

## ✅ 第 1 步：Vercel 控制面板检查

### 变量名称和值的检查
1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目 (XL01 或 techpulse-daily)
3. 进入 **Settings** → **Environment Variables**

**关键检查点：**
- [ ] 变量名称：必须 **完全一致** `GOOGLE_AI_API_KEY`（区分大小写！）
- [ ] 没有多余空格，格式是 `GOOGLE_AI_API_KEY` = `your-api-key-here`
- [ ] API Key 值不为空（至少 39 个字符的随机字符串）
- [ ] API Key 来自 [Google AI Studio](https://aistudio.google.com/app/apikey)

### 环境选择的检查 ⚠️ 最容易忽视
1. 找到 `GOOGLE_AI_API_KEY` 这一行
2. 右侧有三个复选框：
   - [ ] **Production** ✓ 必须勾选
   - [ ] **Preview** ✓ 必须勾选（测试修改时需要）
   - [ ] **Development** ✓ 可选但建议勾选

**如果只勾选了 Production，那么在 Preview 分支测试时 Key 读不到！**

---

## ✅ 第 2 步：Redeploy 清除缓存

1. 在 Vercel Dashboard 项目中，点击 **Deployments**
2. 找到最近的成功部署（绿色状态）
3. 点击该部署右侧的 **...** (三个点)
4. 选择 **Redeploy**
5. 重要：如果出现选项 "Use existing Build Cache"，**取消勾选它**
6. 点击 **Redeploy** 完成

**等待 2-3 分钟让部署完成。**

---

## ✅ 第 3 步：验证代码逻辑

已确认 `/api/ai-handler.ts` 中的关键代码存在：

```typescript
export default async function handler(req: any, res: any) {
  // 强制在 handler 函数内部读取，确保 Vercel Runtime 已经加载变量
  const apiKey = (process.env.GOOGLE_AI_API_KEY || '').trim();
  
  if (!apiKey || apiKey === 'not-configured') {
    return res.status(500).json({
      success: false,
      error: 'Vercel Environment Variable GOOGLE_AI_API_KEY is missing or empty!',
      debug: { hasKey: !!apiKey, keyLength: apiKey?.length || 0 }
    });
  }
  // ...
}
```

✅ 代码逻辑正确

---

## ✅ 第 4 步：测试 API 端点

### 获取测试 URL
1. 在 Vercel Dashboard 中，复制你的项目 URL（例如 `https://techpulse-daily.vercel.app`）
2. 测试以下端点：

```bash
# 测试 1：简单文本生成
curl "https://your-project.vercel.app/api/ai-handler?action=text&prompt=Hello"

# 测试 2：新闻生成（会返回特定格式的 JSON）
curl "https://your-project.vercel.app/api/ai-handler?action=news"

# 测试 3：POST 请求
curl -X POST "https://your-project.vercel.app/api/ai-handler" \
  -H "Content-Type: application/json" \
  -d '{"action":"text","prompt":"Test prompt"}'
```

### 预期响应
- **成功**：`{ "success": true, "data": "...", "model": "gemini-2.0-flash" }`
- **失败 - 缺少 Key**：`{ "success": false, "error": "Vercel Environment Variable..." }`

---

## 🔍 诊断步骤（如果仍然失败）

### 行为 1：收到 400 错误（API Key not found）
- ✅ 路径和模型名对了
- ❌ Key 没有被读到

**解决方案：** 返回第 1 步和第 2 步

### 行为 2：收到 500 错误（GOOGLE_AI_API_KEY is missing）
- 这表示代码正确检测到了 Key 缺失
- **检查清单：**
  - [ ] 在 Vercel 中添加了环境变量？
  - [ ] 勾选了所有三个环境（Production、Preview、Development）？
  - [ ] 点击了 Redeploy（不使用缓存）？

### 行为 3：收到 429（Rate Limited）
- 这说明 Key 被读到了，但超过了配额
- 可能需要：
  - [ ] 检查 API Key 是否有效
  - [ ] 在 [Google Cloud Console](https://console.cloud.google.com) 中检查配额

---

## 🛠️ 本地测试

如果想在本地快速验证 API Key 是否可用：

```bash
# 1. 获取 API Key（从 https://aistudio.google.com/app/apikey）
export GOOGLE_AI_API_KEY="your-api-key-here"

# 2. 测试 Gemini API 连接
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$GOOGLE_AI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "Hello"}]}],
    "generationConfig": {"maxOutputTokens": 100}
  }'
```

如果收到 200 响应且包含内容，说明 API Key 有效。

---

## 📋 快速检查清单

- [ ] Vercel 中有 `GOOGLE_AI_API_KEY` 变量
- [ ] 变量勾选了所有三个环境（Production、Preview、Development）
- [ ] API Key 来自 https://aistudio.google.com/app/apikey
- [ ] 点击了 Redeploy（未使用缓存）
- [ ] 等待了 2-3 分钟让部署完成
- [ ] 测试了 API 端点，收到了成功或失败的明确响应
- [ ] 如果是 500 错误，说明代码正确检测到了问题

---

## 🆘 仍然无法解决？

请收集以下信息并提供给我：

1. **Vercel 部署日志**：
   - 在 Deployments 中点击最近的部署
   - 查看 Build Logs（应该没有错误）
   - 截图或复制相关行

2. **API 调用响应**：
   ```bash
   curl -v "https://your-project.vercel.app/api/ai-handler?action=text&prompt=test"
   ```
   复制完整的响应（包括 headers）

3. **当前 API Key 状态**：
   - 是否能在本地测试中成功调用 Gemini API？
   - API Key 长度是多少？（例如 39 字符）
