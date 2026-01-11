# Gemini 到千问 (Qwen) 迁移指南

## 📋 迁移概述

本项目已从 Google Gemini 模型完全迁移到阿里云的 **通义千问 (Qwen)** 模型。千问是一个强大的多模态大语言模型，性能优异。

## ✅ 已完成的更改

### 1. 依赖更新
**文件**: `package.json`

**之前**:
```json
"dependencies": {
  "@google/genai": "^1.34.0",
  "@google/generative-ai": "^0.24.1",
  ...
}
```

**之后**:
```json
"dependencies": {
  "@alibabacloud/qwen": "^0.1.0",
  "axios": "^1.6.0",
  ...
}
```

### 2. 后端 API 迁移
**文件**: `api/ai-handler.ts`

#### 主要变化:
- 移除 Google Generative AI 导入
- 添加 Axios 用于 HTTP 请求
- 更新环境变量: `GEMINI_API_KEY` → `QWEN_API_KEY` 或 `DASHSCOPE_API_KEY`

#### 模型替换:
| 功能 | Gemini 模型 | Qwen 模型 |
|------|-----------|---------|
| 文本生成 | gemini-2.5-flash | qwen-max |
| 回退模型1 | gemini-2.0-flash | qwen-turbo |
| 回退模型2 | gemini-2.0-flash-lite | qwen-plus |
| 语音合成 | gemini-2.5-flash | cosyvoice-v1 |

#### API 端点:
```typescript
// 文本生成
const QWEN_TEXT_API = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

// 语音合成
const QWEN_TTS_API = 'https://dashscope.aliyuncs.com/api/v1/services/tts/text-to-speech';
```

### 3. 前端 API 迁移
**文件**: `每日科技脉搏 app/api/news.ts`

- 移除 Google GenAI 导入
- 使用 Axios 调用千问 API
- 更新模型列表为: `qwen-max`, `qwen-turbo`, `qwen-plus`

### 4. 环境变量配置
**文件**: `.env.example`

**新增配置**:
```bash
# 千问 AI (阿里云 DashScope API)
QWEN_API_KEY=sk-xxxxx  # 从 https://dashscope.aliyuncs.com 获取
# 或
DASHSCOPE_API_KEY=sk-xxxxx
```

## 🚀 部署说明

### 1. 获取千问 API 密钥

1. 访问 [阿里云 DashScope](https://dashscope.aliyuncs.com)
2. 使用阿里云账户登录或注册
3. 进入 API 密钥管理页面
4. 创建新的 API 密钥
5. 复制密钥值

### 2. 配置环境变量

#### 本地开发 (.env.local):
```bash
QWEN_API_KEY=sk-your-api-key-here
```

#### Vercel 部署:
1. 进入 Vercel 项目设置
2. 找到 "Environment Variables"
3. 添加新环境变量:
   - 名称: `QWEN_API_KEY` 或 `DASHSCOPE_API_KEY`
   - 值: 你的千问 API 密钥
4. 重新部署项目

### 3. 安装依赖

```bash
npm install
# 或
yarn install
```

## 📝 API 使用示例

### 文本生成请求

```bash
curl -X POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation \
  -H "Authorization: Bearer sk-xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-max",
    "messages": [
      {
        "role": "user",
        "content": "你好，请生成一篇技术新闻摘要"
      }
    ],
    "parameters": {
      "max_tokens": 2000,
      "temperature": 0.7,
      "top_p": 0.8
    }
  }'
```

### 语音合成请求

```bash
curl -X POST https://dashscope.aliyuncs.com/api/v1/services/tts/text-to-speech \
  -H "Authorization: Bearer sk-xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "cosyvoice-v1",
    "input": {
      "text": "这是一条测试文本"
    },
    "parameters": {
      "voice": "xiaoxiao",
      "rate": 1.0,
      "volume": 50
    }
  }'
```

## 🔄 故障排除

### 问题 1: 401 未授权错误
**原因**: API 密钥无效或未配置

**解决方案**:
1. 确认 API 密钥正确
2. 检查环境变量是否正确设置
3. 验证密钥在阿里云控制台中仍然有效

```bash
echo $QWEN_API_KEY  # 检查密钥是否已设置
```

### 问题 2: 429 速率限制错误
**原因**: 请求频率过高

**解决方案**:
- 系统已配置自动降级机制
- 首先尝试 `qwen-max`，失败后自动切换到 `qwen-turbo`，再切换到 `qwen-plus`
- 可通过增加请求延迟来缓解

### 问题 3: 超时错误
**原因**: 网络连接慢或 API 响应慢

**解决方案**:
- 增加超时时间（当前设置为 30 秒）
- 检查网络连接
- 确认千问 API 服务正常运行

## 📊 模型对比

### 千问 (Qwen) 模型特性

| 模型 | 性能 | 速度 | 成本 | 用途 |
|------|------|------|------|------|
| qwen-max | 最强 | 中等 | 高 | 复杂任务、高精度需求 |
| qwen-turbo | 很强 | 快速 | 中 | 日常任务、速度优先 |
| qwen-plus | 良好 | 最快 | 低 | 简单任务、成本优先 |

### 推荐配置

- **新闻生成**: `qwen-max` (最佳质量)
- **图片提示词**: `qwen-turbo` (速度+质量平衡)
- **语音合成**: `cosyvoice-v1` (专业 TTS 模型)

## 🎯 优势对比

### 千问 vs Gemini

| 特性 | 千问 | Gemini |
|------|-----|--------|
| 中文支持 | 优秀 | 良好 |
| 成本 | 竞争力强 | 较高 |
| 稳定性 | 稳定 | 时有波动 |
| API 速度 | 快速 | 中等 |
| 多模态 | 支持 | 支持 |
| 中国服务 | ✅ | ❌ |

## 💡 最佳实践

1. **环境变量管理**: 使用 `.env.local` 和 Vercel 环境变量分离管理
2. **错误处理**: 系统已实现自动降级机制，无需额外配置
3. **监控**: 在日志中查看使用的模型和性能指标
4. **成本控制**: 使用 `qwen-turbo` 或 `qwen-plus` 进行一般性任务

## 📚 相关文档

- [阿里云 DashScope 官方文档](https://dashscope.aliyuncs.com/api-details)
- [千问模型详细说明](https://www.alibabacloud.com/product/dashscope)
- [API 参考](https://help.aliyun.com/zh/dashscope)

## ✨ 后续改进建议

1. 添加更详细的日志记录用于调试
2. 实现请求速率限制和队列系统
3. 集成成本监控仪表板
4. 支持更多千问模型变体
5. 实现自定义模型配置接口

## 📞 支持

如遇到问题，请:
1. 检查 `.env` 文件中的环境变量
2. 查看应用日志获取详细错误信息
3. 验证千问 API 密钥的有效性
4. 联系阿里云技术支持

---

**迁移完成日期**: 2026-01-11
**迁移版本**: 1.0.0
