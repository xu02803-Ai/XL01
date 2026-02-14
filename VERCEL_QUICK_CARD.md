# 🎯 Vercel API Key 问题 - 快速参考卡片

## 📋 问题症状
```
❌ 400 Bad Request: API key not found
❌ 错误来自 Google API
❌ 路径和模型都对，唯独 Key 没传过去
```

---

## ⚡ 3 步快速修复

### 1️⃣ 检查 Vercel 设置
```
Dashboard → 项目 → Settings → Environment Variables

✓ 名称: GOOGLE_AI_API_KEY (准确拼写！)
✓ 勾选: Production + Preview + Development
✓ 值: 你的 API Key (从 aistudio.google.com/app/apikey 获取)
```

### 2️⃣ Redeploy
```
Deployments → 最近部署 → ... → Redeploy
(取消勾选缓存) → 等待 2-3 分钟
```

### 3️⃣ 测试
```bash
curl "https://your-project.vercel.app/api/ai-handler?action=text&prompt=test"
```

---

## 🔧 诊断工具

### 快速测试 API Key
```bash
node test-vercel-setup.js "your-api-key"

预期结果: ✅ API Key 完全有效！
```

### 完整诊断（包括 Vercel）
```bash
node test-vercel-setup.js "your-api-key" "https://your-project.vercel.app"

预期结果:
✅ Google API Key: 有效
✅ Vercel 部署: 工作
```

### Shell 诊断
```bash
./diagnose-vercel-env.sh
```

---

## 🚨 常见错误

| 错误信息 | 原因 | 解决方案 |
|---------|------|--------|
| `GOOGLE_AI_API_KEY is missing` | 环境变量未被读到 | 检查 Vercel 中勾选了所有三个环境 |
| `Preview 分支读不到 Key` | Preview 环境没勾选 | ✓ 勾选 Preview 环境，Redeploy |
| `改了环境变量后仍不工作` | 没有 Redeploy | 必须 Redeploy 才能生效 |
| `API key not valid` | Key 过期或无效 | 获取新 Key: https://aistudio.google.com/app/apikey |

---

## 📊 问题诊断树

```
400 Bad Request (API Key not found)
│
├─ 运行: node test-vercel-setup.js "key"
│  │
│  ├─ ❌ Google API 失败 → Key 无效，获取新 Key
│  │
│  └─ ✅ Google API 通过 → 继续检查 Vercel
│      │
│      └─ 运行: node test-vercel-setup.js "key" "vercel-url"
│         │
│         ├─ ✅ Vercel 成功 → 问题已解决！
│         │
│         └─ ❌ Vercel 失败: GOOGLE_AI_API_KEY is missing
│            │
│            ├─ 检查变量名: GOOGLE_AI_API_KEY (准确拼写)
│            ├─ 检查环境: ✓ Production ✓ Preview ✓ Development
│            ├─ 点击 Redeploy (不使用缓存)
│            └─ 等待 2-3 分钟，重试
```

---

## 📚 文档导航

| 需求 | 文档 |
|------|------|
| 快速修复 | [VERCEL_QUICK_FIX.md](VERCEL_QUICK_FIX.md) |
| 详细检查清单 | [VERCEL_ENV_CHECKLIST.md](VERCEL_ENV_CHECKLIST.md) |
| 完整行动计划 | [VERCEL_ACTION_PLAN.md](VERCEL_ACTION_PLAN.md) |
| 解决方案总结 | [VERCEL_SOLUTION_SUMMARY.md](VERCEL_SOLUTION_SUMMARY.md) |

---

## 💡 最关键的 3 点

1. **Preview 环境必须勾选** ⭐  
   如果在 PR/Preview 上测试但只勾选了 Production，Key 读不到

2. **必须 Redeploy**  
   改完环境变量后不会自动生效，必须手动 Redeploy

3. **等待 2-3 分钟**  
   Vercel 需要时间构建和部署，不能立即测试

---

## 🎯 优先级检查

- [ ] 本地测试 API Key：`node test-vercel-setup.js "key"`
- [ ] Vercel 中 GOOGLE_AI_API_KEY 名称准确
- [ ] ✓ Preview 环境勾选 (⭐ 最容易忽视)
- [ ] ✓ Production 和 Development 勾选
- [ ] 执行 Redeploy (不使用缓存)
- [ ] 等待 2-3 分钟
- [ ] 完整测试：`node test-vercel-setup.js "key" "url"`
- [ ] 手动 curl 测试 API 端点

---

## 🆘 仍未解决？

按这个顺序检查：

1. **本地验证**
   ```bash
   node test-vercel-setup.js "your-key"
   ```

2. **获取诊断信息**
   ```bash
   curl -v "https://your-project.vercel.app/api/ai-handler?action=text&prompt=test"
   ```

3. **查看部署日志**
   - Vercel Dashboard → Deployments → 最近部署 → Function Logs

4. **收集信息并寻求帮助**
   - 诊断脚本的输出
   - API 调用的完整响应
   - 环境变量配置截图

---

**快速链接:**
- 🔗 [Google AI Studio](https://aistudio.google.com/app/apikey)
- 🔗 [Vercel Dashboard](https://vercel.com/dashboard)
- 📖 [完整解决方案](./VERCEL_SOLUTION_SUMMARY.md)
