# ✅ Vercel 环境变量问题 - 完整解决方案

**问题:** 400 Bad Request (API Key not found) 在 Vercel 部署中  
**根本原因:** GOOGLE_AI_API_KEY 环境变量未被正确读取  
**状态:** ✅ 已完成全面诊断和改进  

---

## 📦 已完成的改动

### 1. ✅ 代码改进
**文件:** [api/ai-handler.ts](api/ai-handler.ts)

**改进内容:**
- ✅ 增强了 handler 函数的环境变量检查逻辑
- ✅ 添加了详细的诊断信息（hasKey、keyLength、isVercel 等）
- ✅ 改进了 generateText 函数的错误报告
- ✅ 显示所有与 KEY 和 GOOGLE 相关的环境变量名

**关键改动:**
```typescript
// 强制在 handler 函数内部读取，确保 Vercel 已加载变量
const apiKey = (process.env.GOOGLE_AI_API_KEY || '').trim();

if (!apiKey || apiKey === 'not-configured') {
  // 返回详细的诊断信息，包括已有的变量名
  const diagnostics = {
    hasKey: !!apiKey,
    keyLength: apiKey?.length || 0,
    isVercel: !!process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV,
    allKeyVariables: Object.keys(process.env)
      .filter(k => k.toUpperCase().includes('KEY'))
  };
  // ...
}
```

### 2. ✅ 诊断工具

#### 工具 A: Node.js 完整测试脚本
**文件:** [test-vercel-setup.js](test-vercel-setup.js)

**功能:**
- 验证 Google API Key 的有效性
- 测试 Vercel 部署端点
- 提供彩色输出的诊断报告

**使用方法:**
```bash
# 仅测试 API Key
node test-vercel-setup.js "your-api-key-here"

# 完整测试（包括 Vercel）
node test-vercel-setup.js "your-api-key-here" "https://your-project.vercel.app"
```

#### 工具 B: Shell 诊断脚本
**文件:** [diagnose-vercel-env.sh](diagnose-vercel-env.sh)

**功能:**
- 检查本地环境变量
- 验证 Google API Key
- 测试 Vercel 部署

**使用方法:**
```bash
./diagnose-vercel-env.sh
```

### 3. ✅ 文档资源

#### 文档 A: 快速修复指南
**文件:** [VERCEL_QUICK_FIX.md](VERCEL_QUICK_FIX.md)

**内容:**
- 5 分钟快速修复步骤
- 问题诊断树
- 常见错误和解决方案
- 本地验证方法

**适合:** 想快速解决问题的用户

#### 文档 B: 完整检查清单
**文件:** [VERCEL_ENV_CHECKLIST.md](VERCEL_ENV_CHECKLIST.md)

**内容:**
- Vercel 控制面板详细检查指南
- Redeploy 完整步骤
- API 测试方法
- 本地测试指南

**适合:** 想全面理解问题的用户

#### 文档 C: 行动计划
**文件:** [VERCEL_ACTION_PLAN.md](VERCEL_ACTION_PLAN.md)

**内容:**
- 3 步快速开始
- 诊断工具使用说明
- 问题诊断树
- 优先级清单

**适合:** 系统性解决问题的用户

---

## 🚀 快速开始

### 方案 A: 最快修复 (3 步，5 分钟)

1. **进入 Vercel Dashboard**
   ```
   https://vercel.com/dashboard 
   → 项目 → Settings → Environment Variables
   ```

2. **验证 GOOGLE_AI_API_KEY**
   - 名称**: `GOOGLE_AI_API_KEY` ✓
   - 值**: 你的 API Key ✓
   - ✓ Production, Preview, Development 全勾选

3. **Redeploy**
   ```
   Deployments 
   → 最近部署 (绿色)
   → ... 
   → Redeploy (不使用缓存)
   → 等待 2-3 分钟
   ```

### 方案 B: 带诊断的修复 (8 步，15 分钟)

```bash
# 1. 测试本地 API Key
node test-vercel-setup.js "your-api-key-here"

# 2. 如果通过，进行 Vercel 部署检查
node test-vercel-setup.js "your-api-key-here" "https://your-project.vercel.app"

# 3. 或运行完整的 shell 诊断
./diagnose-vercel-env.sh
```

---

## 📋 文件清单

| 文件 | 类型 | 用途 |
|------|------|------|
| [VERCEL_ACTION_PLAN.md](VERCEL_ACTION_PLAN.md) | 📄 文档 | 完整行动计划和诊断树 |
| [VERCEL_QUICK_FIX.md](VERCEL_QUICK_FIX.md) | 📄 文档 | 快速修复指南 |
| [VERCEL_ENV_CHECKLIST.md](VERCEL_ENV_CHECKLIST.md) | 📄 文档 | 详细检查清单 |
| [test-vercel-setup.js](test-vercel-setup.js) | 🔧 脚本 | Node.js 诊断工具 |
| [diagnose-vercel-env.sh](diagnose-vercel-env.sh) | 🔧 脚本 | Shell 诊断工具 |
| [api/ai-handler.ts](api/ai-handler.ts) | 💻 代码 | 改进的 API Handler |

---

## 🔍 问题诊断

### 第一步：检查错误类型

**错误信息:** `400 Bad Request` (来自 Google API)
```json
{
  "error": "API key not valid for this request"
}
```
→ Key 被读到了，但无效或过期 → 需要新 Key

**错误信息:** `500 Server Error`
```json
{
  "error": "GOOGLE_AI_API_KEY is missing or empty"
}
```
→ Key 根本没被读到 → 检查 Vercel 环境变量配置

**错误信息:** `404 Not Found`
```
Cannot route /api/ai-handler
```
→ API 路由配置错误 → 检查 vercel.json

---

### 第二步：根据诊断脚本结果选择方案

#### 情况 A: `node test-vercel-setup.js` 通过 ✅

**结果:**
```
✅ Google API Key: 有效
```

**说明:** Key 本身没问题  
**下一步:** 检查 Vercel 环境变量配置
```bash
# 完整测试 Vercel 部署
node test-vercel-setup.js "your-key" "https://your-project.vercel.app"
```

#### 情况 B: `node test-vercel-setup.js` 失败 ❌

**结果:**
```
❌ Google API Key: 无效或已过期
```

**说明:** API Key 本身有问题  
**解决方案:**
1. 获取新 Key：https://aistudio.google.com/app/apikey
2. 更新 Vercel 中的 GOOGLE_AI_API_KEY
3. Redeploy

#### 情况 C: Vercel 测试失败 ❌，但 Google API Key 有效 ✅

**结果:**
```
✅ Google API Key: 有效
❌ Vercel 部署: 500 - GOOGLE_AI_API_KEY is missing
```

**说明:** Vercel 没有读到环境变量  
**检查清单:**
- [ ] 变量名是 `GOOGLE_AI_API_KEY` (准确拼写)
- [ ] 勾选了 Preview 环境 (⭐ 最容易忽视)
- [ ] 点击了 Redeploy (不使用缓存)
- [ ] 等待了 2-3 分钟

---

## 💡 常见问题

### Q1: 为什么我的 Key 在本地工作但在 Vercel 上不工作？
**A:** 本地和 Vercel 是两个独立的环境。本地 .env 文件不会被同步到 Vercel。你需要在 Vercel Dashboard 中单独配置环境变量。

### Q2: Redeploy 时应该选哪个选项？
**A:** 
- 取消勾选 "Use existing Build Cache" (如果出现的话)
- 确保完全重新构建

### Q3: 为什么改了环境变量后还是不工作？
**A:** 必须 Redeploy。只是在 Dashboard 中看到变量还是不够的。需要：
1. 保存变量配置
2. 进入 Deployments
3. 点击最近部署旁的 ...
4. 选择 Redeploy

### Q4: Preview 和 Production 有什么区别？
**A:** 
- **Production:** 主分支/发布版本
- **Preview:** PR 分支/测试版本
- 如果你在 PR 上测试但只勾选了 Production，Key 在 Preview 中无法读取

### Q5: API Key 看起来应该是什么样的？
**A:** 
- 长度：通常 30-40 个字符
- 开头：应该以 `AIza` 开头
- 来源：https://aistudio.google.com/app/apikey

---

## 🧪 验证解决方案

### 验证步骤

1. **本地验证 API Key:**
```bash
node test-vercel-setup.js "your-api-key"
```
预期输出：`✅ API Key 完全有效！`

2. **测试 Vercel 部署:**
```bash
node test-vercel-setup.js "your-api-key" "https://your-project.vercel.app"
```
预期输出：
```
✅ Google API Key: 有效
✅ Vercel 部署: 工作
✨ Vercel 部署正常工作！
```

3. **手动 API 测试:**
```bash
curl "https://your-project.vercel.app/api/ai-handler?action=text&prompt=hello"
```
预期响应：
```json
{
  "success": true,
  "data": "...",
  "model": "gemini-2.0-flash",
  "timestamp": "2026-02-14T..."
}
```

---

## 📞 仍需帮助？

### 收集信息并提供

1. **诊断脚本的完整输出:**
```bash
node test-vercel-setup.js "your-key" "https://your-project.vercel.app"
```

2. **API 调用的完整响应:**
```bash
curl -v "https://your-project.vercel.app/api/ai-handler?action=text&prompt=test"
```

3. **Vercel 部署日志:**
- 访问 Vercel Dashboard
- Deployments → 最近部署 → Function Logs
- 截图或复制日志

4. **环境变量配置截图:**
- Settings → Environment Variables
- 显示 GOOGLE_AI_API_KEY 的配置和勾选状态

---

## 📚 相关资源

- [Google AI Studio - 获取 API Key](https://aistudio.google.com/app/apikey)
- [Vercel 环境变量文档](https://vercel.com/docs/projects/environment-variables)
- [Google Gemini API 文档](https://ai.google.dev/docs)
- [Vercel 部署文档](https://vercel.com/docs/deployments)

---

**最后更新:** 2026 年 2 月 14 日  
**状态:** ✅ 完整解决方案已准备  
**下一步:** 按照快速开始指南进行操作
