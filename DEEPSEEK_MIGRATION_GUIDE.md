# DeepSeek API 迁移指南

## 概述

已成功将 AI 接口从 Google Gemini 迁移至 **DeepSeek API**。

## 变更摘要

### 模型替换

| 原模型 | 新模型 | 用途 |
|--------|--------|------|
| Gemini 2.5 Flash | DeepSeek Chat (deepseek-chat) | 通用对话、文本生成 |
| Gemini 2.0 Flash | DeepSeek Reasoner (deepseek-reasoner) | 推理、复杂问题处理 |
| Gemini 2.0 Flash Lite | DeepSeek Reasoner (降级) | 配额用尽时的备用 |

### API 功能

#### ✅ 保留功能
- **文本生成** (`?action=text`) - 新闻生成、内容生成
- **图片提示词生成** (`?action=image`) - 用于 Pollinations.ai 图片生成

#### ❌ 移除功能
- **语音合成** (TTS) - 已移除，可使用替代服务如：
  - Web Speech API（浏览器原生）
  - ElevenLabs API
  - Azure Speech Service
  - Google Cloud Text-to-Speech

## 环境配置

### 新增环境变量

```bash
# .env 或环境配置中添加：
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

移除以下环境变量：
```bash
# 不再需要
GEMINI_API_KEY=xxx
```

## 文件变更

### 1. `/api/ai-handler.ts`
**主要变化：**
- 移除 Google Generative AI 依赖导入
- 添加 DeepSeek API 调用函数 `callDeepSeekAPI()`
- 实现两层降级策略：
  - 第一优先：`deepseek-chat`（通用对话，V3 级别）
  - 第二备用：`deepseek-reasoner`（推理模型，更强大但可能更慢）

**关键函数：**
```typescript
async function callDeepSeekAPI(
  apiKey: string, 
  prompt: string, 
  model: "deepseek-chat" | "deepseek-reasoner"
): Promise<string>
```

### 2. `/每日科技脉搏 app/services/geminiService.ts`
**主要变化：**
- `generateNewsAudio()` 函数改为返回 `null`（TTS 支持移除）
- 添加注释说明替代方案

### 3. `/package.json`
**移除依赖：**
```json
"@google/genai": "^1.34.0",
"@google/generative-ai": "^0.24.1"
```

运行以下命令更新依赖：
```bash
npm install
# 或
npm ci
```

## API 调用示例

### 文本生成（新闻）
```bash
curl -X GET "http://localhost/api/ai-handler?action=text&dateStr=2024-01-06" \
  -H "Content-Type: application/json"
```

或 POST：
```bash
curl -X POST "http://localhost/api/ai-handler" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "text",
    "prompt": "生成最新的科技新闻..."
  }'
```

### 图片提示词生成
```bash
curl -X GET "http://localhost/api/ai-handler?action=image&headline=AI突破性发现" \
  -H "Content-Type: application/json"
```

## 响应格式

### 成功响应
```json
{
  "success": true,
  "data": "生成的内容...",
  "model": "deepseek-chat"
}
```

### 错误响应
```json
{
  "error": "错误描述",
  "details": "详细错误信息"
}
```

## 模型参数说明

### deepseek-chat（推荐）
- **用途**：快速的通用对话和文本生成
- **响应时间**：快速
- **成本**：相对低
- **最大 tokens**：4000
- **temperature**：1.0（确保多样性）

### deepseek-reasoner
- **用途**：复杂推理、深度分析
- **响应时间**：较慢（包含思考过程）
- **成本**：相对高
- **最大 tokens**：8000
- **thinking budget**：4000（推理 tokens 预算）
- **temperature**：1.0

## 降级策略

当 `deepseek-chat` 遇到以下错误时自动降级至 `deepseek-reasoner`：
- HTTP 429（Rate Limited）
- 配额限制错误
- 其他限流错误

## 性能对比

| 指标 | Gemini 2.5 Flash | DeepSeek Chat | DeepSeek Reasoner |
|-----|------------------|----------------|-------------------|
| 响应速度 | 快 | 快 | 中等 |
| 推理能力 | 中等 | 中等 | 强 |
| 成本效率 | 低 | 高 | 中等 |
| 可靠性 | 一般 | 高 | 高 |

## 故障排查

### 错误：「服务器未配置 DEEPSEEK_API_KEY」
**解决方案：**
1. 检查环境变量是否正确设置
2. 确认 API Key 格式正确（通常以 `sk-` 开头）
3. 重启应用服务

### 错误：「所有文本生成通道均不可用」
**原因可能：**
- DeepSeek API 配额用尽
- 网络连接问题
- API Key 无效或权限不足

**解决方案：**
1. 检查 DeepSeek 账户配额和使用情况
2. 验证网络连接
3. 检查 API Key 是否正确

### TTS 功能不可用
**原因：** 已移除 Gemini TTS 支持

**替代方案：**
选择以下方案之一：
1. **Web Speech API**（浏览器原生，无成本）
   ```javascript
   const utterance = new SpeechSynthesisUtterance(text);
   speechSynthesis.speak(utterance);
   ```

2. **ElevenLabs API**（高质量语音）
3. **Azure Speech Service**（Microsoft）
4. **Google Cloud Text-to-Speech**（继续使用 Google）

## 测试清单

- [ ] API 环境变量配置正确
- [ ] 依赖已安装（运行 `npm install`）
- [ ] 文本生成测试通过
- [ ] 图片提示词生成测试通过
- [ ] 降级机制正常工作
- [ ] 错误处理和日志记录正常

## 后续改进

### 可能的增强功能
1. **缓存层** - 缓存常见提示词的响应
2. **异步处理** - 大型内容生成时使用任务队列
3. **监控和告警** - 实时监控 API 配额使用情况
4. **多模型支持** - 添加更多 DeepSeek 模型选项

## 参考文档

- [DeepSeek API 官方文档](https://platform.deepseek.com/api-docs)
- [API 价格对比](https://platform.deepseek.com/pricing)
- [常见问题解答](https://platform.deepseek.com/faq)

## 联系支持

如有问题，请：
1. 查看错误日志
2. 检查 DeepSeek API 状态页
3. 联系 DeepSeek 技术支持团队
