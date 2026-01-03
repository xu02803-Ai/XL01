# Gemini API 智能降级机制

## 概述

当 Google Gemini 2.5 API 配额被限制时，系统会自动降级到 Gemini 1.5 Flash，确保服务连续性。

## 模型优先级

系统会按照以下优先级自动尝试调用 API：

1. **gemini-2.5-flash** (主模型 - 最快、成本最低)
2. **gemini-1.5-flash** (备用模型 - 稳定可靠)
3. **gemini-1.5-pro-exp-0514** (最后备用 - 高质量但较慢)

## 工作原理

### 自动降级逻辑

```typescript
┌─────────────────────────────────────┐
│  调用 Gemini 2.5 Flash             │
└──────────────┬──────────────────────┘
               │
               ├─ ✅ 成功 → 返回结果，记录统计
               │
               └─ ❌ 失败 → 检查错误类型
                  │
                  ├─ 配额错误 (RESOURCE_EXHAUSTED) → 尝试 1.5 Flash
                  │
                  └─ 其他错误 → 尝试 1.5 Flash
                     │
                     └─ 继续降级直到成功或全部失败
```

### 错误识别

系统识别以下错误作为配额用尽的标志：
- `RESOURCE_EXHAUSTED` - 配额已用尽
- `quota` - 配额相关错误
- `exceeded` - 超出限制
- `429` - 请求过多（HTTP）
- `rate limit` - 速率限制

## 使用的 API

### 1. 文本生成 (api/generate-content.ts)

处理新闻内容生成，自动在 2.5 和 1.5 之间降级：

```bash
# 调用示例
curl "https://your-domain.com/api/generate-content"
```

**返回示例：**
```json
{
  "success": true,
  "data": "[{\"headline\": \"...\"}]",
  "model": "gemini-2.5-flash"
}
```

### 2. 图片提示生成 (api/generate-image.ts)

生成技术感十足的图片提示词和关键词提取，支持自动降级：

```bash
curl "https://your-domain.com/api/generate-image?headline=AI新突破"
```

### 3. 语音合成 (api/synthesize-speech.ts)

专门的 TTS 降级处理：
- 主模型：`gemini-2.5-flash-preview-tts`
- 备用模型：`gemini-1.5-pro`

```bash
curl "https://your-domain.com/api/synthesize-speech?text=新闻摘要&voice=female"
```

**返回示例：**
```json
{
  "success": true,
  "data": "base64_audio_data",
  "mimeType": "audio/mpeg",
  "model": "gemini-2.5-flash-preview-tts"
}
```

## 模型监控端点

### 获取模型状态统计

```bash
GET /api/model-stats
```

**响应示例：**
```json
{
  "success": true,
  "timestamp": "2026-01-03T10:30:00.000Z",
  "models": [
    {
      "model": "gemini-2.5-flash",
      "successCount": 45,
      "errorCount": 2,
      "successRate": "95.74%",
      "lastError": "RESOURCE_EXHAUSTED",
      "lastErrorTime": "2026-01-03T10:25:00.000Z",
      "disabled": false
    },
    {
      "model": "gemini-1.5-flash",
      "successCount": 3,
      "errorCount": 0,
      "successRate": "100.00%",
      "disabled": false
    },
    {
      "model": "gemini-1.5-pro-exp-0514",
      "successCount": 0,
      "errorCount": 0,
      "successRate": "N/A",
      "disabled": false
    }
  ],
  "summary": {
    "totalRequests": 50,
    "totalSuccesses": 48,
    "totalErrors": 2,
    "overallSuccessRate": "96.00%",
    "recommendedAction": "✅ Primary model functioning normally"
  }
}
```

### 重置统计数据

```bash
POST /api/model-stats
Content-Type: application/json

{
  "action": "reset"
}
```

### 禁用特定模型

当某个模型出现持续问题时，可以手动禁用它：

```bash
POST /api/model-stats
Content-Type: application/json

{
  "action": "disable",
  "model": "gemini-2.5-flash"
}
```

### 启用特定模型

重新启用之前禁用的模型：

```bash
POST /api/model-stats
Content-Type: application/json

{
  "action": "enable",
  "model": "gemini-2.5-flash"
}
```

## 监控和告警

### 关键指标

1. **成功率** - 每个模型的成功请求占比
   - ✅ >95% - 模型正常运行
   - ⚠️ 50-95% - 间歇性错误，需要关注
   - ❌ <50% - 模型可能存在问题

2. **错误率** - 失败请求数量
   - 监控最后错误和错误时间戳

3. **降级触发** - 统计何时切换到备用模型
   - 如果频繁切换到 1.5 Flash，说明 2.5 配额已用尽

### 建议行动

根据 `summary.recommendedAction` 字段判断：

| 状态 | 含义 | 行动 |
|------|------|------|
| ✅ Primary model functioning normally | 主模型正常工作 | 无需操作 |
| 🔄 Using fallback models | 使用备用模型 | 检查 2.5 配额，考虑升级计划 |
| ⚠️ All models experiencing issues | 所有模型故障 | 检查 API 密钥和网络连接 |

## 成本优化

### 模型成本对比

- **gemini-2.5-flash** - 最经济（推荐用于日常使用）
- **gemini-1.5-flash** - 中等成本（备用选择）
- **gemini-1.5-pro-exp-0514** - 最高成本（仅在必要时使用）

### 配额管理建议

1. **监控使用量** - 定期检查 `/api/model-stats`
2. **设置告警** - 当成功率低于 80% 时告警
3. **调整请求频率** - 根据配额情况优化请求间隔
4. **考虑升级** - 当经常触发降级时，考虑提升配额

## 日志示例

### 成功的降级过程

```
📰 Calling Gemini API with fallback support
🤖 Attempting API call with model: gemini-2.5-flash
⚠️ Model gemini-2.5-flash failed: RESOURCE_EXHAUSTED
🔄 Quota exceeded for gemini-2.5-flash, trying next model...
🤖 Attempting API call with model: gemini-1.5-flash
✅ Success with model gemini-1.5-flash (3 successes)
📰 API Response received from model: gemini-1.5-flash
```

### 全部失败

```
📰 Calling Gemini API with fallback support
🤖 Attempting API call with model: gemini-2.5-flash
⚠️ Model gemini-2.5-flash failed: RESOURCE_EXHAUSTED
🤖 Attempting API call with model: gemini-1.5-flash
⚠️ Model gemini-1.5-flash failed: Authentication failed
❌ All models failed. Model statistics: [...]
```

## 实现细节

### 关键函数

#### `callGeminiWithFallback(apiKey, prompt, config)`

```typescript
/**
 * 调用 Gemini API 并自动降级
 * @param apiKey - Google API 密钥
 * @param prompt - 提示词
 * @param config - 配置（model, maxTokens, temperature 等）
 * @returns {success, content?, model?, error?}
 */
```

#### `callTTSWithFallback(apiKey, text, voiceName)`

```typescript
/**
 * 调用 TTS 模型并自动降级
 * @param apiKey - Google API 密钥
 * @param text - 要转换的文本
 * @param voiceName - 声音名称（Puck/Kore）
 * @returns {success, data?, mimeType?, model?, error?}
 */
```

#### `getModelStats()`

获取所有模型的实时统计信息

#### `disableModel(modelId)` / `enableModel(modelId)`

手动控制模型的启用/禁用状态

## 常见问题

### Q: 如果 2.5 配额用尽，用户会遇到延迟吗？

**A:** 是的，但可以接受。1.5 Flash 虽然稍慢，但仍然很快。延迟增加通常在 1-2 秒内。

### Q: 如何确保总是有可用的模型？

**A:** 系统有 3 层降级，且 1.5-pro-exp 通常有独立的配额。多层降级确保高可用性。

### Q: 能否手动强制使用特定模型？

**A:** 可以。通过 `POST /api/model-stats` 的 `disable`/`enable` 操作控制。

### Q: 这是否会增加成本？

**A:** 会略微增加，但幅度取决于需要降级的频率。建议监控成本并根据需要升级配额。

## 部署检查清单

- [x] 安装了 `@google/genai` 包
- [x] 环境变量 `GEMINI_API_KEY` 或 `API_KEY` 已设置
- [ ] 所有 API 密钥都对应不同的项目/配额（推荐）
- [ ] 已在 Vercel 或托管平台中设置了环境变量
- [ ] 测试了 `/api/model-stats` 端点
- [ ] 配置了监控和告警规则

## 相关文件

- [api/gemini-utils.ts](api/gemini-utils.ts) - 核心降级逻辑
- [api/generate-content.ts](api/generate-content.ts) - 文本生成集成
- [api/generate-image.ts](api/generate-image.ts) - 图片生成集成
- [api/synthesize-speech.ts](api/synthesize-speech.ts) - 语音合成集成
- [api/model-stats.ts](api/model-stats.ts) - 监控端点

## 版本历史

### v1.0 (2026-01-03)
- 实现基础的模型降级机制
- 支持 gemini-2.5-flash → 1.5-flash → 1.5-pro
- 添加模型统计监控
- 集成到内容生成、图片生成、语音合成
