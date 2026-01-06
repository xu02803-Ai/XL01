# DeepSeek API 配置示例

## 环境变量设置

将以下配置添加到你的 `.env` 文件或系统环境变量中：

```bash
# DeepSeek API 配置
DEEPSEEK_API_KEY=sk-your-api-key-here
```

## 获取 API Key

### 步骤 1：访问 DeepSeek 官网
- 前往 [DeepSeek 官方网站](https://www.deepseek.com/)
- 或直接进入 [API 平台](https://platform.deepseek.com/)

### 步骤 2：创建账户
- 使用邮箱或社交媒体账号注册
- 完成邮箱验证

### 步骤 3：生成 API Key
1. 登录平台
2. 前往「API 密钥」或「API Keys」部分
3. 点击「创建新密钥」或「Create New Key」
4. 复制生成的密钥（通常以 `sk-` 开头）

### 步骤 4：保护你的密钥
- ⚠️ **从不在代码中硬编码 API Key**
- ⚠️ **从不在公开仓库中提交 API Key**
- 使用环境变量或密钥管理服务
- 定期轮换密钥

## 不同环境的配置

### 本地开发

创建 `.env.local` 文件：
```bash
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Docker 环境

在 `docker-compose.yml` 中：
```yaml
services:
  api:
    environment:
      DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY}
```

运行容器：
```bash
docker run -e DEEPSEEK_API_KEY="sk-xxx" your-app
```

### Vercel 部署

在 Vercel 仪表板中：
1. 项目 → Settings
2. Environment Variables
3. 添加 `DEEPSEEK_API_KEY`

### GitHub Actions

在工作流文件中：
```yaml
env:
  DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
```

在 GitHub 中：
1. Settings → Secrets and variables → Actions
2. 添加新的 Repository Secret
3. 名称：`DEEPSEEK_API_KEY`
4. 值：你的 API Key

## 配置验证

### 方法 1：运行测试脚本

创建 `test-deepseek.ts`：
```typescript
const apiKey = process.env.DEEPSEEK_API_KEY;

if (!apiKey) {
  console.error('❌ DEEPSEEK_API_KEY 未设置');
  process.exit(1);
}

console.log('✅ API Key 已配置');
console.log(`✅ Key 格式正确: ${apiKey.startsWith('sk-')}`);
```

运行：
```bash
npx ts-node test-deepseek.ts
```

### 方法 2：测试 API 连接

```bash
curl -X POST https://api.deepseek.com/chat/completions \
  -H "Authorization: Bearer sk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Hello"}],
    "temperature": 1
  }'
```

## 常见问题

### Q: API Key 在哪里可以找到？
A: 登录 [DeepSeek 平台](https://platform.deepseek.com/) → API Keys 部分

### Q: 如何轮换 API Key？
A: 在 API Keys 管理页面删除旧 Key，创建新 Key

### Q: API Key 被泄露了怎么办？
A: 立即在平台中删除该 Key，立即创建新 Key

### Q: 环境变量不生效？
A: 
1. 确认变量名称完全匹配
2. 重启应用或 IDE
3. 检查环境变量是否被其他配置覆盖

### Q: 如何检查配额使用？
A: 在 [DeepSeek 平台](https://platform.deepseek.com/) 的「用量」或「Usage」部分查看

## 费用估算

### 定价信息

访问 [DeepSeek 定价页面](https://platform.deepseek.com/pricing) 查看最新价格。

### 成本控制建议

1. **设置速率限制** - 防止意外高费用
2. **监控使用** - 定期检查 API 调用量
3. **优化提示词** - 使用更简洁的提示以减少 tokens
4. **缓存响应** - 避免重复调用相同请求
5. **批量处理** - 集中处理多个请求

## 安全最佳实践

✅ **DO（应该做）**
- 使用环境变量存储敏感信息
- 定期轮换 API Keys
- 实施访问控制和日志记录
- 监控异常 API 活动

❌ **DON'T（不应该做）**
- 在代码中硬编码 API Keys
- 在 Git 仓库中提交密钥
- 与他人分享 API Key
- 在客户端代码中使用 API Key

## 下一步

1. ✅ 配置 `DEEPSEEK_API_KEY` 环境变量
2. ✅ 运行配置验证
3. ✅ 测试 API 连接
4. ✅ 启动应用
5. ✅ 监控初期使用情况

有任何问题，请参考 [DEEPSEEK_MIGRATION_GUIDE.md](./DEEPSEEK_MIGRATION_GUIDE.md)
