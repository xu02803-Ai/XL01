# 🚀 千问 API 500 错误快速修复 (5 分钟)

## ⚡ 症状
- API 返回 **500 错误**
- 错误消息: **"没有可用的千问模型"**
- 代码看起来没问题

## 🔍 根本原因
**99% 情况**: API Key 未配置或无效

## ✅ 快速修复 (5 步)

### 1️⃣ 获取 API Key (2 分钟)

访问: https://dashscope.aliyuncs.com/user

复制你的 API Key (格式: `sk-xxxxx`)

### 2️⃣ 本地测试 (1 分钟)

创建 `.env.local`:
```
DASHSCOPE_API_KEY=sk-your-key-here
```

### 3️⃣ 验证模型已开通

访问: https://bailian.console.aliyun.com/model-market

搜索 "qwen-plus"，确保状态是 "已开通"

### 4️⃣ Vercel 配置 (1 分钟)

1. 进入 Vercel 项目 → Settings → Environment Variables
2. 添加:
   ```
   DASHSCOPE_API_KEY = sk-your-key
   ```

### 5️⃣ 重新部署 (1 分钟)

进入 Vercel → Deployments → 最新部署 → Redeploy

## 📋 验证清单

- [ ] API Key 已复制（无空格、无换行）
- [ ] Vercel 环境变量已配置
- [ ] 已重新部署
- [ ] 等待 2-5 分钟

## 🧪 测试

```bash
curl -X POST http://localhost:3000/api/qwen-chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"你好"}]}'
```

**成功响应**: 包含 `"role": "assistant"` 的 JSON

**失败响应**: `"没有可用的千问模型"`

## 🆘 如果还是不工作

检查：
- [ ] API Key 格式: `sk-`开头
- [ ] 账户余额: 需要 ≥ 0（不要欠费）
- [ ] 模型状态: "已开通"
- [ ] baseURL: 是否是 `compatible-mode/v1`

## 📞 关键链接

| 需要 | 链接 |
|------|------|
| 🔑 API Key | https://dashscope.aliyuncs.com/user |
| 📦 模型库 | https://bailian.console.aliyun.com/model-market |
| 💰 账户余额 | https://account.aliyun.com |
| 🚀 部署仪表板 | https://vercel.com/dashboard |

## 💡 最常见的错误

```
❌ API Key 末尾有空格
✅ 直接粘贴完整密钥，无任何多余字符

❌ 账户欠费
✅ 充值即使只有 1 块钱，API 会恢复

❌ 忘记重新部署
✅ Vercel 环境变量必须在部署时被应用

❌ baseURL 使用错误
✅ 必须是: https://dashscope.aliyuncs.com/compatible-mode/v1
```

## 📖 更多信息

完整指南: [QWEN_API_500_ERROR_FIX.md](./QWEN_API_500_ERROR_FIX.md)

诊断工具: 
```bash
bash diagnose-qwen-api.sh
```

---

**记住**: 代码 99% 是正确的，问题通常是配置！✅
