# Gemini API 迁移指南

## 已完成的迁移

项目已从 **Qwen（千问）** 完全迁移到 **Google Gemini** API。

### 变更摘要

| 项目 | 之前 | 现在 |
|-----|------|------|
| **主模型** | qwen-plus | gemini-2.0-flash |
| **备选模型 1** | qwen-turbo | gemini-1.5-flash |
| **备选模型 2** | qwen-coder-plus | gemini-1.5-pro |
| **SDK** | OpenAI（兼容模式）| @google/generative-ai |
| **API Key** | DASHSCOPE_API_KEY | GOOGLE_AI_API_KEY |
| **费用** | ¥0.8/百万 tokens | **免费** (15 RPM, 100K tokens/月) |

---

## 为什么选择 Gemini？

### Gemini 2.0 Flash 的优势

✅ **免费额度最高**
- 每分钟 15 次请求（RPM）
- 每月 100 万 tokens（完全免费）
- 无需付费激活，直接可用

✅ **性能优异**
- 比 Gemini 1.5 快 2 倍
- 可处理 100 万 token 的长文本
- 支持流式输出

✅ **易于集成**
- Google 官方SDK 简洁易用
- 完全兼容 Vercel 部署
- 国际化支持好

---

## 环境变量配置

### 本地开发（.env.local）

```bash
GOOGLE_AI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
JWT_SECRET=your_jwt_secret
```

### 获取 GOOGLE_AI_API_KEY

**方式 1：Google AI Studio（推荐，最快）**
1. 访问 https://aistudio.google.com/app/apikey
2. 点击 "Create API key"
3. 选择 "Create API key in new Google Cloud project"
4. 复制 API Key，粘贴到 `.env.local`

**方式 2：Google Cloud Console**
1. 访问 https://console.cloud.google.com
2. 创建新项目（或选择现有项目）
3. 启用 "Generative Language API"
4. 创建 API Key（类型：API Key）
5. 在 IAM 中授予权限

---

## 本地测试

### 1. 安装依赖

```bash
npm install
cd 每日科技脉搏\ app
npm install
cd ../
```

### 2. 设置环境变量

```bash
echo "GOOGLE_AI_API_KEY=your_key_here" > .env.local
echo "SUPABASE_URL=your_url" >> .env.local
echo "SUPABASE_SERVICE_KEY=your_key" >> .env.local
echo "JWT_SECRET=test_secret_123" >> .env.local
```

### 3. 测试诊断端点

```bash
# 检查环境变量是否正确
curl http://localhost:3000/api/diagnose
```

响应应该显示：
```json
{
  "environmentVariables": {
    "GOOGLE_AI_API_KEY": {
      "exists": true,
      "value": "***set***"
    },
    "SUPABASE_URL": {
      "exists": true,
      "value": "***set***"
    }
  }
}
```

### 4. 测试新闻生成

```bash
# 生成技术新闻
curl http://localhost:3000/api/gemini?action=news

# 生成文本
curl http://localhost:3000/api/gemini?action=text&prompt=hello

# 生成图片提示词
curl http://localhost:3000/api/gemini?action=image-prompt&headline="AI新突破"
```

---

## Vercel 部署

### 1. 连接 GitHub

1. 访问 https://vercel.com
2. 点击 "New Project"
3. 导入 GitHub 仓库 XL01

### 2. 配置环境变量

在 Vercel 项目设置中：

**Settings** → **Environment Variables** → 添加：

```
Name: GOOGLE_AI_API_KEY
Value: sk-xxxxx...
Environment: All (Production, Preview, Development)
```

```
Name: SUPABASE_URL
Value: https://xxx.supabase.co
Environment: All
```

```
Name: SUPABASE_SERVICE_KEY
Value: eyJxxx...
Environment: All
```

```
Name: JWT_SECRET
Value: your_secret_key_here
Environment: All
```

### 3. 重新部署

- Settings → 找到你的最新部署
- 右上角点击三个点菜单 → **Redeploy**
- 等待 2-5 分钟部署完成

### 4. 验证部署

```bash
# 替换为你的 Vercel 域名
curl https://your-project.vercel.app/api/diagnose

# 测试新闻生成
curl https://your-project.vercel.app/api/gemini?action=news
```

---

## Gemini API 配额和限制

### 免费计划（Gemini 2.0 Flash）

| 限制 | 数量 |
|-----|------|
| **每分钟请求数（RPM）** | 15 |
| **每月 tokens** | 1,000,000 |
| **上下文窗口** | 100,000 tokens |
| **并发请求** | 2 |

### 如果超出限制

项目会**自动降级**到：
1. gemini-1.5-flash（如果 2.0 不可用）
2. gemini-1.5-pro（最终备选）

```typescript
// api/gemini.ts 中的自动降级逻辑
const TEXT_MODELS = [
  'gemini-2.0-flash',      // 首选
  'gemini-1.5-flash',      // 备选 1
  'gemini-1.5-pro'         // 备选 2
];
```

### 升级到付费版本

如果需要更高配额：
1. 访问 Google Cloud Console
2. 启用 Billing（需要信用卡）
3. 配额将大幅增加

---

## 常见问题

### Q: 如何检查剩余配额？

A: 访问 Google AI Studio → API Keys → 查看配额使用情况

### Q: "RESOURCE_EXHAUSTED" 错误是什么？

A: 表示超出了本月的配额限制。解决方案：
- 等到下月 1 日（配额重置）
- 升级到付费版本
- 代码会自动使用备选模型

### Q: 中文支持如何？

A: Gemini 2.0 对中文支持很好。可以直接用中文提示词。

### Q: TTS（语音合成）怎么办？

A: Gemini API 不支持原生 TTS。可以：
- 使用 Web Speech API（客户端）
- 集成 Google Cloud TTS（需付费）
- 使用 Azure Speech Services（需付费）

### Q: 如何回滚到 Qwen？

A: 在 Git 历史中找到之前的提交：
```bash
git log --oneline | grep -i qwen
git checkout <commit_hash>
npm install  # 重新安装 Qwen 依赖
```

---

## 成本对比

### 场景 1：小规模使用（免费额度内）
- 月请求数：5,000
- 月 tokens：500K
- **Gemini 成本**：**¥0**（免费）✅
- **Qwen 成本**：¥0.4 元

### 场景 2：中等规模（超出免费额度）
- 月请求数：50,000
- 月 tokens：5M
- **Gemini 成本**：需要升级到付费版本
- **Qwen 成本**：¥4 元

### 场景 3：大规模使用（需要高可用）
- 月请求数：500,000
- 月 tokens：50M
- **Gemini 成本**：$0.075/M = $3.75（约 ¥27）
- **Qwen 成本**：¥40 元

**结论**：
- 免费额度内：**Gemini 最优** ✅
- 超出额度：Gemini 付费版更便宜

---

## 监控和调试

### 查看 API 日志

**本地：**
```bash
npm run dev  # 开发服务器会打印 API 调用日志
```

**Vercel：**
1. 打开 Vercel 仪表盘
2. 选择项目 → **Logs** → **Function Logs**
3. 查看实时 API 调用日志

### 常见日志信息

✅ 成功：
```
🚀 Calling Gemini model: gemini-2.0-flash
✅ Text generation successful with model: gemini-2.0-flash
```

⚠️ 降级：
```
❌ Error with model gemini-2.0-flash: RESOURCE_EXHAUSTED
🔄 gemini-2.0-flash rate limit exceeded, trying next model...
🚀 Calling Gemini model: gemini-1.5-flash
```

❌ 错误：
```
❌ API Error: GOOGLE_AI_API_KEY not configured
```

---

## 文件变更清单

### 新增
- ✅ `api/gemini.ts` - Gemini API 核心实现

### 修改
- ✅ `每日科技脉搏 app/api/news.ts` - 使用 Gemini 替代 Qwen
- ✅ `api/diagnose.ts` - 环境变量检查更新为 GOOGLE_AI_API_KEY
- ✅ `package.json` - 移除 openai，添加 @google/generative-ai
- ✅ `每日科技脉搏 app/package.json` - 同步更新依赖

### 保留（不变）
- ✅ `api/qwen.ts` - 仍在（备用，但不使用）
- ✅ `api/oauth/callback.ts` - OAuth 逻辑不变
- ✅ `vercel.json` - 构建配置不变
- ✅ `tsconfig.json` - TypeScript 配置不变

---

## 后续步骤

### 立即实施
1. ✅ 设置 `GOOGLE_AI_API_KEY` 环境变量
2. ✅ 在本地测试：`npm run dev`
3. ✅ 在 Vercel 配置环境变量并重新部署

### 可选优化
- [ ] 添加 Gemini API 监控（Google Cloud Monitoring）
- [ ] 实现图片生成（Gemini Vision API）
- [ ] 集成 Google Cloud TTS 替代 Gemini TTS

### 如果需要回滚
```bash
# 查看提交历史
git log --oneline

# 回到 Qwen 版本
git checkout <qwen-commit-hash>

# 重新部署
git push -f origin main
```

---

## 支持资源

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API 文档](https://ai.google.dev/docs)
- [Gemini 模型列表](https://ai.google.dev/models)
- [配额和限制](https://ai.google.dev/pricing)
- [官方示例](https://github.com/google/generative-ai-js)

---

## 总结

| 方面 | Qwen | Gemini | 选择 |
|-----|------|--------|------|
| 费用 | ¥0.8/M | **免费** (100K/月) | ✅ Gemini |
| 性能 | 快 | **更快** | ✅ Gemini |
| 中文 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Qwen |
| 集成度 | 高 | **简单** | ✅ Gemini |
| 国内访问 | ✅ 稳定 | 一般 | Qwen |
| **总体** | 好 | **更优** | ✅ Gemini |

**结论**：迁移到 Gemini 获得了更高的免费额度和更好的性能，同时保持代码质量。🎉

