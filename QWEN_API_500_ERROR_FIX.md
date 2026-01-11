# 🔧 千问 API 500 错误 - 完整排查和修复指南

## 📊 诊断结果

### ✅ 已验证正确的项目配置

```
✅ baseURL: https://dashscope.aliyuncs.com/compatible-mode/v1  (正确)
✅ 模型名称: qwen-plus, qwen-turbo, qwen-coder-plus  (正确)
✅ openai SDK: 已安装 v4.52.0  (正确)
✅ 代码实现: 使用标准 OpenAI SDK  (正确)
```

### ❌ 可能的问题

如果你在 Vercel 上收到 **500 错误** + "没有可用的千问模型"，问题通常是：

1. **API Key 未配置或配置错误**
2. **模型未在阿里云账户中开通**
3. **账户欠费导致 API 被禁用**
4. **环境变量未生效**

---

## 🚀 分步修复

### 步骤 1: 检查 API Key

#### 方式 A: 获取新的 API Key

1. 访问 [阿里云百炼控制台](https://bailian.console.aliyun.com/)
2. 登录你的阿里云账户
3. 进入 "API-Key管理"
4. 点击 "创建新的API-Key"
5. **重要**: 复制完整的密钥，确保没有空格或换行

✅ **正确格式**: `sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`  
❌ **错误格式**: `sk-xxxxx ` (末尾有空格), `sk-xxxxx\n` (含换行符)

#### 方式 B: 使用现有 API Key

如果你已有 API Key，验证它：
- 登录 [DashScope 控制台](https://dashscope.aliyuncs.com/)
- 检查 API Key 是否仍然有效（过期会导致 401）

---

### 步骤 2: 本地测试 API Key

在项目根目录创建 `.env.local`:

```bash
DASHSCOPE_API_KEY=sk-your-actual-key-here
```

**不要**包含其他字符或注释！直接是：
```
DASHSCOPE_API_KEY=sk-xxxxxxxxxxx
```

#### 本地测试命令

如果你的 API 服务在本地运行 (localhost:3000)：

```bash
curl -X POST http://localhost:3000/api/qwen-chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "你好"}
    ],
    "model": "qwen-plus"
  }'
```

**预期响应**:
```json
{
  "success": true,
  "message": {
    "role": "assistant",
    "content": "你好！有什么我可以帮助你的吗？"
  },
  "model": "qwen-plus",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

如果收到 **"没有可用的千问模型"** 错误，检查：
- ❌ API Key 是否正确
- ❌ 模型是否已开通
- ❌ 账户是否欠费

---

### 步骤 3: 验证模型是否已开通

在阿里云百炼控制台：

1. 访问 [模型库](https://bailian.console.aliyun.com/model-market)
2. 搜索 "qwen-plus"
3. 检查状态：
   - ✅ 已开通 → 可以使用
   - ⏳ 申请中 → 等待审核
   - ❌ 未开通 → 点击"申请使用"

**重要**: 新账户可能需要申请免费额度！

---

### 步骤 4: 检查账户余额

1. 登录 [阿里云控制台](https://account.aliyun.com/login/login.htm)
2. 进入 "费用" → "账户余额"
3. 检查余额：
   - ✅ 余额 ≥ 0 → 正常使用
   - ❌ 余额 < 0 → **API 被禁用**，需要充值

**如果账户欠费**: 充值一点金额（哪怕只是 1 块钱），API 会立即恢复

---

### 步骤 5: 配置 Vercel 环境变量

1. 进入 [Vercel 项目仪表板](https://vercel.com/dashboard)
2. 点击你的项目
3. 进入 "Settings" → "Environment Variables"
4. 点击 "Add Environment Variable"
5. 配置：
   - **Name**: `DASHSCOPE_API_KEY`
   - **Value**: `sk-your-actual-key` (粘贴刚才获取的完整密钥)
6. 选择应用范围：`Production` + `Preview` + `Development`
7. 点击 "Save"

---

### 步骤 6: 重新部署到 Vercel

**关键**: 环境变量必须在部署时被应用

#### 方式 A: 手动重新部署 (推荐)

1. 进入 Vercel 仪表板
2. 点击项目
3. 进入 "Deployments" 标签
4. 找到最新部署
5. 点击 "..." → "Redeploy"

#### 方式 B: 推送代码重新部署

```bash
git add .
git commit -m "chore: update API configuration"
git push origin main
```

**等待部署完成**（通常 2-5 分钟）

---

## 🧪 验证修复

### 1️⃣ 检查部署日志

在 Vercel 仪表板：
1. 进入 "Deployments"
2. 点击最新部署
3. 查看 "Logs" 标签

检查是否有错误信息：
```
❌ "没有可用的千问模型" 
❌ "401 Unauthorized"
❌ "Invalid API key"
```

### 2️⃣ 测试 API

访问你的部署 URL（例如 `https://your-project.vercel.app`）

如果有前端应用，尝试生成新闻或调用 API。

或者使用 curl:
```bash
curl -X POST https://your-project.vercel.app/api/qwen-chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"测试"}]}'
```

### 3️⃣ 查看实时日志

```bash
vercel logs --follow
```

监听实时日志，看看 API 调用的情况。

---

## 🆘 如果仍然报错

### 错误: "没有可用的千问模型"

检查列表：
- [ ] API Key 是否正确复制（无空格、无换行）
- [ ] 模型 `qwen-plus` 是否已开通
- [ ] 账户余额是否为正数
- [ ] baseURL 是否是 `https://dashscope.aliyuncs.com/compatible-mode/v1`
- [ ] 在 Vercel 重新部署后是否等待 2-5 分钟

### 错误: "401 Unauthorized"

- [ ] API Key 是否有效（过期或被删除）
- [ ] API Key 是否在 Vercel 中正确配置
- [ ] 是否有其他账户限制（封号、风险等）

### 错误: "404 Not Found"

- [ ] baseURL 是否正确
- [ ] 模型名称是否正确（大小写敏感）

### 错误: "429 Too Many Requests"

- API 被限流，等待几秒后重试
- 检查是否超过免费额度限制

---

## 📋 完整检查清单

```
□ API Key 已获取并复制
□ .env.local 已创建 (本地开发)
□ 本地测试成功
□ 模型已在阿里云开通
□ 账户余额为正数
□ Vercel 环境变量已配置
□ Vercel 已重新部署
□ 等待 2-5 分钟让环境变量生效
□ 部署日志无报错
□ API 能成功响应
```

---

## 📚 快速参考

### 关键 URL

- 🔑 **API Key 获取**: https://dashscope.aliyuncs.com/user
- 📦 **模型库**: https://bailian.console.aliyun.com/model-market
- 💰 **账户余额**: https://account.aliyun.com
- 🚀 **Vercel 仪表板**: https://vercel.com/dashboard
- 📖 **千问 API 文档**: https://help.aliyun.com/zh/dashscope

### 正确的配置值

```
baseURL: https://dashscope.aliyuncs.com/compatible-mode/v1
model: qwen-plus (或 qwen-turbo, qwen-max, qwen-coder-plus)
apiKey: sk-xxxxxxxxxxxxxxxxxx
```

### 诊断命令

```bash
# 本地测试 API Key
curl -X POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions \
  -H "Authorization: Bearer sk-your-key" \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen-plus","messages":[{"role":"user","content":"hi"}]}'

# 查看 Vercel 日志
vercel logs --follow

# 重新部署
vercel redeploy
```

---

## 💡 常见陷阱

1. **API Key 末尾有空格** → 401 错误
2. **模型名称大小写错误** → 404 错误  
3. **baseURL 使用了原生 API 地址** → 不兼容
4. **环境变量未重新部署** → 仍使用旧配置
5. **账户欠费** → 所有 API 调用都返回 500
6. **模型未开通** → "没有可用的模型" 错误

---

## 🎯 预期结果

修复完成后，你应该能看到：

```json
{
  "success": true,
  "message": {
    "role": "assistant",
    "content": "你好！有什么我可以帮助你的吗？"
  },
  "model": "qwen-plus"
}
```

而不是：

```json
{
  "error": "没有可用的千问模型"
}
```

---

**最后更新**: 2026-01-11  
**诊断工具**: `/diagnose-qwen-api.sh`  
**状态**: ✅ 代码正确，需要检查环境配置
