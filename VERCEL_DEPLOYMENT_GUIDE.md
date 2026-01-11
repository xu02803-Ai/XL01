# Vercel 部署指南

## 快速开始（3分钟）

### 步骤 1：访问 Vercel
1. 访问 https://vercel.com
2. 用 GitHub 账号登录（或创建账户）

### 步骤 2：导入项目
1. 点击 **New Project** 按钮
2. 选择 **Import Git Repository**
3. 搜索 `XL01` 仓库并选择
4. 点击 **Import**

### 步骤 3：配置环境变量
Vercel 会自动读取你的 `vercel.json` 配置：
```json
{
  "buildCommand": "npm install && cd '每日科技脉搏 app' && npm run build",
  "installCommand": "npm install && cd '每日科技脉搏 app' && npm install",
  "outputDirectory": "每日科技脉搏 app/dist",
  "framework": "vite"
}
```

添加必需的环境变量：
- **DASHSCOPE_API_KEY** 或 **QWEN_API_KEY**
  - 获取地址：https://dashscope.aliyuncs.com/user
  - 格式：`sk-xxxxx`
  - 设置：Settings → Environment Variables → Add
- **SUPABASE_URL**
  - 获取地址：https://app.supabase.com → Project → API
- **SUPABASE_SERVICE_KEY**
  - 同上
- **JWT_SECRET**
  - 随机值（用于 JWT 签名）
- **其他 OAuth 凭证**（如需要）：
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`
  - `DISCORD_CLIENT_ID`
  - `DISCORD_CLIENT_SECRET`

### 步骤 4：部署
1. 检查构建设置（应该都是正确的）
2. 点击 **Deploy** 按钮
3. 等待构建完成（通常 2-5 分钟）

### 步骤 5：验证部署
- 部署完成后，你会获得一个 `.vercel.app` 的 URL
- 访问该 URL 进行测试
- 检查浏览器控制台是否有错误

## 后续部署

### 自动部署
- 任何 push 到 `main` 分支的代码都会自动部署
- 预览部署：Pull Requests 会自动生成预览链接

### 手动重新部署
1. 在 Vercel 仪表盘选择项目
2. Deployments → 最新部署 → 右上角三点菜单
3. 点击 **Redeploy**

## 故障排除

### 构建失败
检查 Vercel 的构建日志：
- Deployments → 失败的部署 → 查看完整日志

常见问题：
- **环境变量未设置**：检查 Settings → Environment Variables
- **依赖缺失**：检查 package.json 中是否有必要的依赖
- **构建命令错误**：检查 vercel.json 中的 buildCommand

### API 500 错误
如果遇到 "没有可用的千问模型" 错误：
1. 确认 `DASHSCOPE_API_KEY` 已正确设置
2. 验证 API Key 的有效性（https://dashscope.aliyuncs.com/user）
3. 检查 Bailian 控制台中是否开启了相应模型（https://bailian.console.aliyun.com）
4. 重新部署（Redeploy）

### 需要查看实时日志
在 Vercel 仪表盘 → 项目 → 选择环境（Production）→ 右上角 Logs

## 自定义域名

1. Vercel 项目 → Settings → Domains
2. 添加你的自定义域名
3. 按照 Vercel 的提示配置 DNS 记录

## 成本考虑

- **Vercel 免费计划**：
  - 无限部署
  - 自动 HTTPS
  - 包含 100GB 带宽/月
  - 无需担心服务器成本

- **Qwen API 成本**：
  - 使用 `qwen-plus`：¥0.8 元/百万 tokens
  - 典型用途：约 ¥0.08-0.09 元/月

## 监控和日志

### 访问日志
- 仪表盘 → Logs → Function Logs

### 性能监控
- 仪表盘 → Analytics

### 错误追踪
- 仪表盘 → Errors

## 相关资源

- [Vercel 文档](https://vercel.com/docs)
- [配置文件参考](https://vercel.com/docs/projects/project-configuration)
- [环境变量设置](https://vercel.com/docs/projects/environment-variables)
- [Qwen API 文档](https://dashscope.aliyuncs.com/docs)

---

**状态**：
- ✅ 前端：已配置为 Vite + React 
- ✅ API：已迁移到 Qwen（开放兼容模式）
- ✅ 构建配置：vercel.json 已配置
- ✅ 代码：已推送到 GitHub
- ⏳ 环境变量：需要在 Vercel 中配置
- ⏳ 部署：等待执行

下一步：按照上述步骤在 https://vercel.com 中完成部署！
