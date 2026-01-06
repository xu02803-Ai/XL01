# Vercel 部署配置指南

## 部署状态 ✅

✅ **代码已推送到 GitHub**
- 提交：`chore: migrate from Gemini to DeepSeek API`
- 提交哈希：`f4ab4ed`
- Vercel 会自动检测并部署此更新

## Vercel 环境变量配置

在 Vercel 仪表板中配置以下环境变量：

### 1. 访问 Vercel 仪表板
- 前往 [Vercel 仪表板](https://vercel.com/dashboard)
- 选择项目 "XL01"

### 2. 配置环境变量

**Settings → Environment Variables**

添加以下环境变量（每个环境分别配置）：

#### 生产环境 (Production)
```
DEEPSEEK_API_KEY = sk-your-production-api-key
```

#### 预览环境 (Preview)
```
DEEPSEEK_API_KEY = sk-your-preview-api-key
```

#### 开发环境 (Development)
```
DEEPSEEK_API_KEY = sk-your-development-api-key
```

### 3. 其他必要环境变量

如果还需要其他环境变量，请按照相同步骤添加：

```
SUPABASE_URL=https://your-supabase-url.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
DATABASE_URL=your-database-url
STRIPE_SECRET_KEY=your-stripe-secret
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable
JWT_SECRET=your-jwt-secret
```

## 部署检查清单

### 前置检查
- [x] 代码已推送到 GitHub
- [x] 提交信息清晰
- [ ] Vercel 环境变量已配置
- [ ] DEEPSEEK_API_KEY 已添加

### 部署验证
- [ ] Vercel 显示「Deployment successful」
- [ ] 生产环境 URL 可访问
- [ ] API 端点响应正常
- [ ] 检查 Vercel 日志是否有错误

### 功能测试
- [ ] 文本生成 API (`/api/ai-handler?action=text`) 可用
- [ ] 图片生成 API (`/api/ai-handler?action=image`) 可用
- [ ] 日志中显示使用的是 deepseek-chat 或 deepseek-reasoner
- [ ] 错误处理正常工作

## 部署命令 (可选)

如果需要从本地手动部署到 Vercel，可使用以下命令：

```bash
# 安装 Vercel CLI（如未安装）
npm install -g vercel

# 登录 Vercel
vercel login

# 部署到预览环境
vercel --prod

# 部署特定环境
vercel --prod --build-env DEEPSEEK_API_KEY=sk-xxx
```

## 部署完成后

### 验证部署
```bash
# 测试文本生成 API
curl "https://your-vercel-url.vercel.app/api/ai-handler?action=text&prompt=Hello"

# 测试图片生成 API
curl "https://your-vercel-url.vercel.app/api/ai-handler?action=image&headline=News"
```

### 监控和日志
- Vercel 仪表板 → Logs（实时日志）
- Vercel 仪表板 → Deployments（部署历史）
- Vercel 仪表板 → Analytics（性能分析）

### 故障排查

**问题：部署失败，显示「Missing DEEPSEEK_API_KEY」**
- 确保在 Vercel 环境变量中添加了 DEEPSEEK_API_KEY
- 变量名称必须完全匹配（区分大小写）
- 添加后需要重新部署

**问题：API 返回 500 错误**
- 检查 Vercel 日志查看具体错误信息
- 验证 DEEPSEEK_API_KEY 是否有效
- 确保 API Key 有正确的权限

**问题：部署速度慢**
- 这是正常的（通常 2-5 分钟）
- 检查 Vercel 部署进度条
- 查看构建日志了解详细信息

## 回滚部署

如果需要回滚到上一个版本：

1. 在 Vercel 仪表板的 **Deployments** 页面
2. 找到上一个成功的部署
3. 点击「Redeploy」按钮
4. 确认部署

## 构建和部署设置

### Build Command
```bash
npm run build
```

### Output Directory
```
.next  # 如果使用 Next.js
dist   # 如果使用其他框架
```

### Install Command
```bash
npm install
```

这些设置通常在 `vercel.json` 中配置：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install"
}
```

## 性能优化建议

1. **启用 Edge Functions** - 减少延迟
2. **启用 ISR** - 优化静态生成
3. **配置 Caching Headers** - 提高缓存效率
4. **使用 Middleware** - 实现自定义逻辑

## 成本管理

- Vercel 免费版本足以满足大多数应用需求
- 按使用量付费（serverless functions、bandwidth、storage）
- 检查 Vercel 仪表板 → Usage 了解成本
- 可设置支出限额防止意外费用

## 更新日志

**2026-01-06**
- ✅ DeepSeek API 迁移完成
- ✅ 代码推送到 GitHub
- ✅ 等待 Vercel 自动部署
- ⏳ 等待配置 DEEPSEEK_API_KEY 环境变量

## 下一步

1. ✅ 前往 Vercel 仪表板
2. ✅ 添加 DEEPSEEK_API_KEY 环境变量
3. ✅ 等待自动部署完成（约 2-5 分钟）
4. ✅ 测试 API 端点
5. ✅ 监控日志和性能

有任何问题，请参考 [DEEPSEEK_SETUP.md](./DEEPSEEK_SETUP.md)
