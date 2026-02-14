# 🎯 Vercel API Key 问题 - 从这里开始

## 👋 欢迎！

你遇到了 **Vercel 部署中 API Key 无法被读取** 的问题。别担心，这是最常见的部署问题之一，我们已经为你准备了完整的诊断和解决方案。

---

## ⚡ 快速 3 步开始

### 步骤 1: 选择你的情况

```
⏱️ 你有多长时间？

□ 2 分钟  → 看 VERCEL_QUICK_CARD.md
□ 5 分钟  → 看 VERCEL_QUICK_FIX.md
□ 15 分钟 → 看 VERCEL_ACTION_PLAN.md
□ 完整理解 → 看 VERCEL_SOLUTION_SUMMARY.md
```

### 步骤 2: 运行诊断工具

```bash
# 获取你的 API Key: https://aistudio.google.com/app/apikey

# 测试 API Key 是否有效
node test-vercel-setup.js "your-api-key-here"

# 完整测试（包括 Vercel）
node test-vercel-setup.js "your-api-key-here" "https://your-project.vercel.app"
```

### 步骤 3: 按照指导修复

基于诊断结果选择相应文档。

---

## 📁 文件导航

### 🚀 快速开始文档（推荐先看）

| 文件 | 时间 | 内容 |
|------|------|------|
| [VERCEL_QUICK_CARD.md](VERCEL_QUICK_CARD.md) | 2分钟 | 一页纸快速参考 |
| [VERCEL_QUICK_FIX.md](VERCEL_QUICK_FIX.md) | 5分钟 | 快速修复步骤 |
| [VERCEL_RESOURCES_INDEX.md](VERCEL_RESOURCES_INDEX.md) | 5分钟 | 资源导航索引 |

### 📖 详细文档

| 文件 | 内容 |
|------|------|
| [VERCEL_ACTION_PLAN.md](VERCEL_ACTION_PLAN.md) | 完整行动计划和诊断树 |
| [VERCEL_ENV_CHECKLIST.md](VERCEL_ENV_CHECKLIST.md) | Vercel 控制面板详细指南 |
| [VERCEL_SOLUTION_SUMMARY.md](VERCEL_SOLUTION_SUMMARY.md) | 完整解决方案总结 |

### 🔧 诊断工具

| 工具 | 用途 |
|------|------|
| [test-vercel-setup.js](test-vercel-setup.js) | Node.js 诊断脚本 |
| [diagnose-vercel-env.sh](diagnose-vercel-env.sh) | Bash 诊断脚本 |

### 📋 项目总结

| 文件 | 说明 |
|------|------|
| [VERCEL_DELIVERY_SUMMARY.md](VERCEL_DELIVERY_SUMMARY.md) | 完整交付内容总结 |
| 本文件 | 快速入门指南 |

---

## 🎓 根据你的情况选择

### 情况 A: 我完全不知道怎么做
👉 **推荐:** [VERCEL_QUICK_CARD.md](VERCEL_QUICK_CARD.md) (2 分钟)  
然后 → 运行诊断工具  
然后 → 按结果选择详细文档

### 情况 B: 我想快速解决问题
👉 **推荐:** [VERCEL_QUICK_FIX.md](VERCEL_QUICK_FIX.md) (5 分钟)  
包含完整的快速修复步骤

### 情况 C: 我想完全理解这个问题
👉 **推荐:** [VERCEL_ACTION_PLAN.md](VERCEL_ACTION_PLAN.md) (15 分钟)  
然后看 → [VERCEL_SOLUTION_SUMMARY.md](VERCEL_SOLUTION_SUMMARY.md) (20 分钟)

### 情况 D: 我需要一步步的详细指导
👉 **推荐:** [VERCEL_ENV_CHECKLIST.md](VERCEL_ENV_CHECKLIST.md)  
每一步都有详细的说明和截图

### 情况 E: 我需要找到什么资源
👉 **推荐:** [VERCEL_RESOURCES_INDEX.md](VERCEL_RESOURCES_INDEX.md)  
完整的资源索引和导航

---

## 🔧 诊断工具使用

### 工具 1: Node.js 快速测试
```bash
# 最简单的测试（只需要 API Key）
node test-vercel-setup.js "your-api-key-from-aistudio"

# 完整测试（需要 Vercel 部署 URL）
node test-vercel-setup.js "your-api-key" "https://your-project.vercel.app"

# 输出示例:
# ✅ Google API Key: 有效
# ❌ Vercel 部署: 500 - GOOGLE_AI_API_KEY is missing
```

### 工具 2: Shell 诊断脚本
```bash
./diagnose-vercel-env.sh

# 会逐步检查:
# 1. 本地环境变量
# 2. Google API Key 有效性
# 3. Vercel 部署可达性 (可选)
```

---

## 💡 问题症状速查表

### 症状 1: 400 Bad Request (来自 Google)
```json
{
  "error": "API key not valid for this request"
}
```
**原因:** API Key 无效或过期  
**解决:** 获取新 Key → https://aistudio.google.com/app/apikey

### 症状 2: 500 Server Error (来自 Vercel)
```json
{
  "error": "GOOGLE_AI_API_KEY is missing or empty"
}
```
**原因:** Vercel 没有读到环境变量  
**解决:** 检查 Vercel 配置 → Redeploy

### 症状 3: 立即测试失败
```bash
# 改完环境变量后立即测试
curl "https://your-project.vercel.app/api/ai-handler"
# ❌ 返回 500 或超时
```
**原因:** Vercel 需要时间构建部署  
**解决:** 等待 2-3 分钟后重试

---

## 🎯 三个最容易踩坑的地方

### ⚠️ 坑 1: Preview 环境没勾选
```
Vercel Settings → Environment Variables

必须同时勾选:
✓ Production
✓ Preview ← 🔴 最容易忘记！
✓ Development

如果只勾选 Production，Preview 分支无法读取 Key！
```

### ⚠️ 坑 2: 改了环境变量后没 Redeploy
```
改完后需要:
Deployments → 最近部署 → ... → Redeploy

⚠️ 只是改设置不会自动生效！
```

### ⚠️ 坑 3: 改完立即测试
```
Redeploy 后需要等待 2-3 分钟
立即测试通常会失败

✅ 等待 2-3 分钟再测试
```

---

## ✅ 完整检查清单

快速检查，看看是否遗漏了什么：

- [ ] 获取了 Google API Key (https://aistudio.google.com/app/apikey)
- [ ] 在 Vercel 中添加了 `GOOGLE_AI_API_KEY` 环境变量
- [ ] 变量名完全准确（区分大小写）
- [ ] ✓ 勾选了 Production 环境
- [ ] ✓ 勾选了 Preview 环境 (⭐ 关键！)
- [ ] ✓ 勾选了 Development 环境
- [ ] 点击了 Redeploy（不使用缓存）
- [ ] 等待了 2-3 分钟
- [ ] 运行了诊断工具测试
- [ ] 手动测试了 API 端点

---

## 📞 我需要更多帮助

### 步骤 1: 收集诊断信息
```bash
# 运行诊断工具并保存输出
node test-vercel-setup.js "your-key" "https://your-project.vercel.app" > diagnosis.txt

# 测试 API 端点
curl -v "https://your-project.vercel.app/api/ai-handler?action=text&prompt=test"
```

### 步骤 2: 查看部署日志
- Vercel Dashboard → Deployments → 最近部署 → Function Logs

### 步骤 3: 提供信息
- 诊断脚本的完整输出 (diagnosis.txt)
- API 调用的完整响应
- Vercel 部署日志截图
- 环境变量配置截图

---

## 🚀 立即开始

### 选项 1: 5 分钟快速修复
```bash
# 1. 读文档
cat VERCEL_QUICK_FIX.md

# 2. 运行诊断
node test-vercel-setup.js "your-key"

# 3. 按指导修复
```

### 选项 2: 完整理解
```bash
# 1. 读快速卡片
cat VERCEL_QUICK_CARD.md

# 2. 运行诊断
node test-vercel-setup.js "your-key" "https://your-project.vercel.app"

# 3. 读对应的详细文档
# 4. 按步骤操作
```

### 选项 3: 看视频教程提示
查看 VERCEL_QUICK_CARD.md 中的问题诊断树，一步步按图索骥。

---

## 📚 参考资源

- [Google AI Studio (获取 API Key)](https://aistudio.google.com/app/apikey)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Vercel 环境变量文档](https://vercel.com/docs/projects/environment-variables)
- [Google Gemini API 文档](https://ai.google.dev/docs)

---

## 🎯 现在就开始

### 第 1 步: 选择文档
👉 **如果你着急:** [VERCEL_QUICK_CARD.md](VERCEL_QUICK_CARD.md)  
👉 **如果你有点时间:** [VERCEL_QUICK_FIX.md](VERCEL_QUICK_FIX.md)  
👉 **如果你想深入理解:** [VERCEL_ACTION_PLAN.md](VERCEL_ACTION_PLAN.md)

### 第 2 步: 获取 API Key
👉 https://aistudio.google.com/app/apikey

### 第 3 步: 运行诊断
👉 `node test-vercel-setup.js "your-key"`

### 第 4 步: 按指导操作
👉 根据诊断结果选择对应文档

---

**祝你解决问题顺利！** 🎉

如果还有问题，检查 [VERCEL_RESOURCES_INDEX.md](VERCEL_RESOURCES_INDEX.md) 找到你需要的资源。
