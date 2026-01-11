# 千问 (Qwen) 快速开始指南

## 🎯 5 分钟快速配置

### 步骤 1: 获取 API 密钥 (2 分钟)

1. 访问 [阿里云 DashScope](https://dashscope.aliyuncs.com)
2. 点击"立即体验"或登录
3. 进入"API-Key管理"
4. 点击"创建新的API-Key"
5. 复制生成的密钥 (格式: `sk-xxxxxxx`)

### 步骤 2: 配置本地环境 (1 分钟)

创建 `.env.local` 文件:

```bash
# 复制到项目根目录的 .env.local
QWEN_API_KEY=sk-your-api-key-here
```

或如果你倾向使用备选名称:

```bash
DASHSCOPE_API_KEY=sk-your-api-key-here
```

### 步骤 3: 安装依赖 (1 分钟)

```bash
npm install
```

### 步骤 4: 启动应用 (1 分钟)

```bash
npm run dev
```

## ✅ 验证配置

### 方法 1: 检查环境变量

```bash
# 在终端中运行
echo $QWEN_API_KEY

# 如果输出显示你的 API 密钥，说明配置正确 ✅
```

### 方法 2: 测试 API 调用

```bash
curl -X GET "http://localhost:3000/api/ai-handler?action=text&prompt=Hello" \
  -H "Content-Type: application/json"
```

预期响应:
```json
{
  "success": true,
  "data": "回复内容...",
  "model": "qwen-max"
}
```

## 🚀 Vercel 部署

### 步骤 1: 连接 Vercel

```bash
vercel
```

### 步骤 2: 添加环境变量

在 Vercel 仪表板:
1. 进入项目设置
2. 找到 "Environment Variables"
3. 添加:
   - **Key**: `QWEN_API_KEY`
   - **Value**: `sk-your-api-key`

### 步骤 3: 重新部署

```bash
vercel --prod
```

## 📊 使用的模型

```
文本生成 (大语言模型):
  ├─ qwen-plus       (0.8元/百万tokens) ⭐ 最便宜  
  ├─ qwen-turbo      (1.5元/百万tokens) 快速
  └─ qwen-coder-plus (1.5元/百万tokens) 备选

语音合成:
  ├─ sambert-zhichu-v1 (完全免费) ✅
  └─ cosyvoice-v1      (付费高质)

图片生成:
  └─ Pollinations API (免费) 🎨
```

## 💰 费用估计 ✅ 优化版本

### 完全免费额度
- 阿里云新用户: 100 万 tokens 免费额度
- sambert-zhichu-v1: 完全免费语音合成
- Pollinations: 无限免费图片生成

### 超出免费额度后价格
| 服务 | 价格 | 说明 |
|------|------|------|
| qwen-plus | ¥0.8/百万 tokens | ⭐ **最便宜** |
| qwen-turbo | ¥1.5/百万 tokens | 快速模型 |
| sambert-zhichu-v1 | 免费 | 中文语音 |
| Pollinations | 免费 | 图片生成 |

### 月度成本估算 (超出免费额度后)
- 100 条新闻 (100K tokens): ¥0.08
- 100 张图片提示词 (10K tokens): ¥0.008
- 50 条语音 (免费): ¥0
- **月总计: ¥0.09** (基本免费!)

[最新价格查询](https://dashscope.aliyuncs.com/pricing)

## 🔍 常见问题

**Q: 如果 API 密钥错误会怎样?**
A: 系统会返回 401 错误。请确保密钥正确，并在阿里云控制台验证其状态。

**Q: 支持离线使用吗?**
A: 否，需要网络连接来调用千问 API。

**Q: 是否可以使用多个 API 密钥?**
A: 可以，但当前实现仅支持单个密钥。可修改代码添加多密钥支持。

**Q: 如何降低成本?**
A: 使用 `qwen-turbo` 或 `qwen-plus` 替代 `qwen-max`，可大幅降低成本。

**Q: 支持流式响应吗?**
A: 当前不支持，但可通过修改代码添加支持。

## 📝 日志检查

查看请求日志以确认使用的模型:

```bash
# 在应用启动后查看输出中的日志
🚀 尝试使用千问模型: qwen-max...
✅ 文本生成成功，使用模型: qwen-max
```

## 🆘 故障排除

### 场景 1: "Missing QWEN_API_KEY"
```bash
# 解决方案
echo "QWEN_API_KEY=sk-your-key" > .env.local
# 重启应用
```

### 场景 2: 429 错误 (速率限制)
```
系统将自动:
1️⃣ 重试 qwen-max
2️⃣ 降级到 qwen-turbo
3️⃣ 最后尝试 qwen-plus
```

### 场景 3: 超时错误
```bash
# 检查网络连接
curl -I https://dashscope.aliyuncs.com

# 确认 API 密钥有效
# 访问: https://dashscope.aliyuncs.com 查看额度
```

## 📚 下一步

1. 阅读 [完整迁移指南](./QWEN_MIGRATION_GUIDE.md)
2. 查看 [API 使用示例](./api/ai-handler.ts)
3. 配置监控和日志
4. 测试所有功能 (新闻生成、语音、图片)

## 🎓 学习资源

- [官方 API 文档](https://help.aliyun.com/zh/dashscope)
- [千问模型介绍](https://baike.baidu.com/item/%E9%80%9A%E4%B9%89%E5%8D%83%E9%97%AE)
- [Axios 文档](https://axios-http.com/)

---

**需要帮助?** 查看完整的 [QWEN_MIGRATION_GUIDE.md](./QWEN_MIGRATION_GUIDE.md)
