# 🚨 Vercel "API Key not found" 问题 - 完整资源包

**问题:** Vercel 部署中收到 `400 Bad Request - API key not found` 错误  
**状态:** ✅ 已完成诊断、代码改进和完整文档  
**日期:** 2026 年 2 月 14 日

---

## 📂 资源导航

### 🎯 按使用场景快速选择

#### 场景 1: "我只有 5 分钟"
👉 [VERCEL_QUICK_CARD.md](VERCEL_QUICK_CARD.md) - 快速参考卡片  
包含: 3 步快速修复、诊断工具、常见错误表

#### 场景 2: "我想快速解决问题"
👉 [VERCEL_QUICK_FIX.md](VERCEL_QUICK_FIX.md) - 快速修复指南  
包含: 5 分钟完整流程、问题诊断、本地验证

#### 场景 3: "我想完全理解问题"
👉 [VERCEL_ACTION_PLAN.md](VERCEL_ACTION_PLAN.md) - 完整行动计划  
包含: 诊断树、问题分析、优先级清单

#### 场景 4: "我需要详细的检查清单"
👉 [VERCEL_ENV_CHECKLIST.md](VERCEL_ENV_CHECKLIST.md) - 详细检查清单  
包含: Vercel 控制面板指南、每一步详细说明

#### 场景 5: "我想看完整的解决方案"
👉 [VERCEL_SOLUTION_SUMMARY.md](VERCEL_SOLUTION_SUMMARY.md) - 完整解决方案  
包含: 所有改动、工具使用、诊断方法

---

### 🔧 诊断工具

#### 工具 1: Node.js 快速测试
```bash
# 仅测试 API Key 有效性
node test-vercel-setup.js "your-api-key"

# 完整测试（包括 Vercel 部署）
node test-vercel-setup.js "your-api-key" "https://your-project.vercel.app"
```
📍 文件: [test-vercel-setup.js](test-vercel-setup.js)  
功能: 验证 Google API Key、测试 Vercel 端点、彩色诊断报告

#### 工具 2: Shell 详细诊断
```bash
./diagnose-vercel-env.sh
```
📍 文件: [diagnose-vercel-env.sh](diagnose-vercel-env.sh)  
功能: 环境变量检查、Google API 测试、Vercel 部署测试

---

### 💻 代码改进

#### 文件: [api/ai-handler.ts](api/ai-handler.ts)

**改进内容:**
- ✅ Handler 函数: 增强环境变量检查和诊断信息
- ✅ generateText 函数: 改进错误报告和 API Key 验证
- ✅ 详细调试输出: 显示所有相关的环境变量

**关键行:**
- 第 40-75 行: Handler 函数的环境变量检查逻辑
- 第 330-345 行: generateText 函数的改进

---

### 📄 文档列表

| 文档 | 适用场景 | 阅读时间 |
|------|---------|--------|
| [VERCEL_QUICK_CARD.md](VERCEL_QUICK_CARD.md) | 快速参考 | 2 分钟 |
| [VERCEL_QUICK_FIX.md](VERCEL_QUICK_FIX.md) | 快速修复 | 5 分钟 |
| [VERCEL_ACTION_PLAN.md](VERCEL_ACTION_PLAN.md) | 完整行动 | 15 分钟 |
| [VERCEL_ENV_CHECKLIST.md](VERCEL_ENV_CHECKLIST.md) | 详细检查 | 10 分钟 |
| [VERCEL_SOLUTION_SUMMARY.md](VERCEL_SOLUTION_SUMMARY.md) | 完整理解 | 20 分钟 |

---

## 🚀 快速开始 (3 步，5 分钟)

### 第 1 步: 检查 Vercel 环境变量
```
Vercel Dashboard 
→ 项目 
→ Settings 
→ Environment Variables

验证:
□ 变量名: GOOGLE_AI_API_KEY (准确拼写)
□ 已勾选: ✓ Production 
□ 已勾选: ✓ Preview (⭐ 最关键)
□ 已勾选: ✓ Development
```

### 第 2 步: Redeploy
```
Vercel Dashboard
→ Deployments
→ 最近的成功部署
→ ... (三个点)
→ Redeploy (取消勾选缓存)

等待 2-3 分钟
```

### 第 3 步: 测试
```bash
# 替换为你的项目 URL
curl "https://your-project.vercel.app/api/ai-handler?action=text&prompt=test"
```

---

## 🔍 问题诊断流程

### 第一步: 识别错误类型

**类型 A: 400 Bad Request (API side)**
```json
{"error": "API key not valid for this request"}
```
→ Key 被读到但无效 → 获取新 Key

**类型 B: 500 Server Error (Vercel side)**
```json
{"error": "GOOGLE_AI_API_KEY is missing or empty"}
```
→ Key 根本没被读到 → 检查环境变量配置

### 第二步: 运行诊断工具

```bash
# 本地验证 API Key
node test-vercel-setup.js "your-key"

# 完整 Vercel 测试
node test-vercel-setup.js "your-key" "https://your-project.vercel.app"
```

### 第三步: 根据结果选择方案

| 诊断结果 | 问题 | 解决方案 |
|---------|------|--------|
| API Key ❌ | Key 无效 | 获取新 Key: https://aistudio.google.com/app/apikey |
| API Key ✅, Vercel ❌ | 环境变量未读到 | 检查 Vercel 配置、Redeploy |
| API Key ✅, Vercel ✅ | ✨ 已解决 | 完成！ |

---

## 💡 最关键的 3 个检查点

### ⭐ 检查点 1: Preview 环境必须勾选
```
如果在 PR/Preview 分支上测试，而 Vercel 中只勾选了 Production，
那么 Key 在 Preview 中无法读取！必须同时勾选 Preview。
```

### ⭐ 检查点 2: 必须点击 Redeploy
```
改完环境变量后不会自动生效。
必须手动进入 Deployments，点击部署旁的 ...，选择 Redeploy。
```

### ⭐ 检查点 3: 等待充足的时间
```
Vercel 需要 2-3 分钟来构建和部署。
改完后立即测试通常会失败。等待后再试。
```

---

## 📋 完整任务清单

- [ ] 获取 API Key (https://aistudio.google.com/app/apikey)
- [ ] 添加到 Vercel 环境变量 (Settings → Environment Variables)
- [ ] 验证变量名: `GOOGLE_AI_API_KEY`
- [ ] 勾选所有三个环境: Production、Preview、Development
- [ ] 点击 Redeploy (不使用缓存)
- [ ] 等待 2-3 分钟
- [ ] 运行诊断: `node test-vercel-setup.js "key" "url"`
- [ ] 手动测试: `curl "https://your-project.vercel.app/api/ai-handler?..."`
- [ ] 查看 Function Logs 如果仍有问题

---

## 🎓 常见问题 (FAQ)

### Q: 为什么我的 Key 在本地工作但在 Vercel 上不工作？
**A:** 本地和 Vercel 是独立环境。本地 .env 文件不会同步到 Vercel。需要在 Vercel Dashboard 中单独配置。

### Q: 为什么改了环境变量后立即测试失败？
**A:** 需要等待 2-3 分钟让 Vercel 构建和部署。改完后立即测试通常会失败。

### Q: Preview 和 Production 有什么区别？
**A:**  
- **Production:** 主分支部署（你推送到 main 时）
- **Preview:** PR/分支部署（你推送到其他分支或创建 PR 时）
- 如果在 Preview 上测试但只勾选 Production，Key 无法被读到

### Q: API Key 看起来应该是什么样的？
**A:** 应该以 `AIza` 开头，包含 30-40 个随机字符，来自 https://aistudio.google.com/app/apikey

### Q: 收到 404 错误怎么办？
**A:** 说明 API 路由未找到。检查 vercel.json 中的 rewrites 配置是否包含 `/api/(.*)`

---

## 🆘 仍需帮助？

### 步骤 1: 收集信息
```bash
# 运行诊断
node test-vercel-setup.js "your-key" "https://your-project.vercel.app"

# 测试 API
curl -v "https://your-project.vercel.app/api/ai-handler?action=text&prompt=test"

# 查看部署日志
# Vercel Dashboard → Deployments → 最近部署 → Function Logs
```

### 步骤 2: 提供以下信息
1. 诊断脚本的完整输出
2. API 调用的完整响应  
3. Vercel 部署日志的相关部分
4. 环境变量配置的截图

---

## 📚 相关资源

| 资源 | 链接 |
|------|------|
| Google AI Studio | https://aistudio.google.com/app/apikey |
| Vercel Dashboard | https://vercel.com/dashboard |
| Vercel 文档 | https://vercel.com/docs |
| Gemini API 文档 | https://ai.google.dev/docs |

---

## 📊 解决方案概要

| 类别 | 完成状态 | 详情 |
|------|--------|------|
| 问题分析 | ✅ | 已确定: 环境变量未被正确读取 |
| 代码改进 | ✅ | 增强 ai-handler.ts 的诊断能力 |
| 诊断工具 | ✅ | Node.js 脚本 + Shell 脚本 |
| 文档 | ✅ | 快速指南 + 详细清单 + 完整方案 |
| 检查清单 | ✅ | 按任务和场景组织 |

---

## 🎯 下一步

### 推荐流程

1. 👉 先看 [VERCEL_QUICK_CARD.md](VERCEL_QUICK_CARD.md) (2 分钟快速了解)

2. 👉 运行诊断工具
   ```bash
   node test-vercel-setup.js "your-key"
   ```

3. 👉 根据诊断结果选择文档
   - Key 有效但 Vercel 失败 → [VERCEL_ACTION_PLAN.md](VERCEL_ACTION_PLAN.md)
   - 需要快速修复 → [VERCEL_QUICK_FIX.md](VERCEL_QUICK_FIX.md)
   - 需要详细检查 → [VERCEL_ENV_CHECKLIST.md](VERCEL_ENV_CHECKLIST.md)

4. 👉 按文档步骤操作

5. ✅ 问题解决！

---

**创建日期:** 2026 年 2 月 14 日  
**最后更新:** 2026 年 2 月 14 日  
**版本:** 1.0  
**状态:** ✅ 完整

---

📍 **当前位置:** [根目录]  
🏠 **返回:** [README.md](README.md)
