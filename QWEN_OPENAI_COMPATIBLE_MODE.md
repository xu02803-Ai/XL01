# 千问 OpenAI 兼容模式 - 最佳实践指南

## 📋 概述

本项目已升级到使用 **OpenAI 兼容模式** 调用千问 API，这是在 Vercel 上部署的最佳方案。

**优势**:
- ✅ 代码最简洁（使用成熟的 OpenAI SDK）
- ✅ 完全兼容 OpenAI 接口
- ✅ 自动错误处理和重试
- ✅ 支持流式输出（解决 Vercel 10s 超时问题）
- ✅ 可直接使用 Vercel `ai` 库

---

## 🚀 快速开始

### 1. 环境配置

在 Vercel 项目设置中添加环境变量：

```bash
DASHSCOPE_API_KEY=sk-your-api-key-here
```

**获取方式**:
1. 访问 [阿里云百炼控制台](https://bailian.console.aliyun.com/)
2. 创建 API Key
3. 复制到 Vercel 环境变量

### 2. 安装依赖

```bash
npm install openai
```

### 3. 使用示例

#### 基础调用

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

// 调用 API
const response = await client.chat.completions.create({
  model: 'qwen-plus',
  messages: [
    { role: 'user', content: '你好' }
  ],
  temperature: 0.7,
  max_tokens: 1000,
});

console.log(response.choices[0].message.content);
```

#### 流式输出（推荐用于 Vercel）

```typescript
// 流式输出可以避免 10 秒超时
const stream = await client.chat.completions.create({
  model: 'qwen-plus',
  messages: [{ role: 'user', content: '写一篇 500 字的文章' }],
  stream: true, // 启用流式输出
});

for await (const chunk of stream) {
  if (chunk.choices[0]?.delta?.content) {
    process.stdout.write(chunk.choices[0].delta.content);
  }
}
```

---

## 📊 支持的模型

### 文本生成模型

| 模型 | 价格 | 速度 | 推荐用途 | 支持 |
|------|------|------|---------|------|
| **qwen-plus** | ¥0.8/百万tokens | 快 | ⭐ 新闻生成、一般任务 | ✅ |
| qwen-turbo | ¥1.5/百万tokens | 非常快 | 实时交互 | ✅ |
| qwen-coder-plus | ¥1.5/百万tokens | 快 | 代码生成 | ✅ |
| qwen-max | ¥28/百万tokens | 中 | 复杂推理 | ✅ |

### 推荐配置

```typescript
// 成本优先
const model = 'qwen-plus';  // 最便宜

// 速度优先
const model = 'qwen-turbo';  // 快速

// 质量优先
const model = 'qwen-max';  // 最强（需付费）
```

---

## ⚠️ Vercel 避坑指南

### 1️⃣ 超时问题（最常见）

**问题**: `504 Gateway Timeout`

**原因**: Vercel Free 版的 Serverless Function 只有 **10 秒超时限制**

**解决方案**:

```typescript
// ❌ 不推荐：容易超时
const response = await openai.chat.completions.create({
  model: 'qwen-max',  // 响应慢，容易超时
  stream: false,
});

// ✅ 推荐：使用 qwen-plus + 流式输出
const stream = await openai.chat.completions.create({
  model: 'qwen-plus',  // 响应快
  stream: true,  // 流式输出，立即返回首个 token
});
```

### 2️⃣ 环境变量生效

**问题**: 新增环境变量后仍然报 401 错误

**解决方案**:
1. 在 Vercel 仪表板添加环境变量
2. **必须重新部署** (Redeploy) 一次，环境变量才会生效
3. 查看部署日志确认环境变量已加载

```bash
vercel env list  # 查看已配置的环境变量
vercel redeploy  # 强制重新部署
```

### 3️⃣ API 密钥安全

**最佳实践**:

```typescript
// ✅ 正确：API 密钥存储在环境变量中
const apiKey = process.env.DASHSCOPE_API_KEY;

// ❌ 错误：API 密钥硬编码在代码中
const apiKey = 'sk-xxxxx';  // 不要这样做！
```

### 4️⃣ Edge Runtime（可选）

如果需要极速响应，可使用 Edge Runtime：

```typescript
export const runtime = 'edge';  // 边界计算，响应更快

export async function POST(req: Request) {
  // ...
}
```

**注意**: Edge Runtime 有限制，某些库可能不兼容

---

## 📝 完整示例

### Next.js App Router (推荐)

**文件**: `app/api/qwen/chat/route.ts`

```typescript
import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

export async function POST(req: Request) {
  try {
    const { messages, model = 'qwen-plus', stream = false } = await req.json();

    const response = await openai.chat.completions.create({
      model,
      messages,
      stream,
      temperature: 0.7,
      max_tokens: 2000,
    });

    if (stream) {
      return new Response((response as any).toReadableStream());
    }

    return NextResponse.json({
      success: true,
      message: response.choices[0].message,
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 500 }
    );
  }
}
```

**前端调用**:

```typescript
const response = await fetch('/api/qwen/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: '你好' }],
    model: 'qwen-plus',
    stream: false,
  }),
});

const data = await response.json();
console.log(data.message.content);
```

### 使用 Vercel `ai` 库（更推荐）

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const { text } = await generateText({
  model: openai('qwen-plus', {
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  }),
  prompt: '你好',
});

console.log(text);
```

---

## 🔄 与旧实现的迁移

### 旧实现（直接调用 DashScope API）

```typescript
// ❌ 旧方式
const response = await axios.post(
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
  { model: 'qwen-plus', messages: [...] },
  { headers: { 'Authorization': `Bearer ${apiKey}` } }
);
```

### 新实现（OpenAI 兼容模式）

```typescript
// ✅ 新方式
const response = await openai.chat.completions.create({
  model: 'qwen-plus',
  messages: [...],
});
```

**优势**:
- 代码更简洁
- 错误处理自动化
- 支持流式输出
- 与 OpenAI 接口兼容

---

## 📊 成本对比

假设月使用量：100K tokens

| 方案 | 成本 | 优势 |
|------|------|------|
| qwen-plus (推荐) | ¥0.08/月 | 最便宜 |
| qwen-turbo | ¥0.15/月 | 速度快 |
| qwen-max | ¥2.8/月 | 质量最好 |
| GPT-4 | ¥30+/月 | - |

---

## 🆘 故障排除

### 错误: 404 Not Found

```
404 Not Found - Model not found
```

**解决方案**:
- 检查模型名称是否正确
- 使用 `qwen-plus` 代替 `qwen-max-latest`

### 错误: 429 Too Many Requests

```
429 Too Many Requests - Rate limit exceeded
```

**解决方案**:
- 降级到 `qwen-plus` 而不是 `qwen-max`
- 添加请求延迟
- 实现重试机制

```typescript
// 简单的重试机制
async function callWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.status === 429 && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
}
```

### 错误: 401 Unauthorized

```
401 Unauthorized - Invalid API key
```

**解决方案**:
1. 验证 `DASHSCOPE_API_KEY` 在 Vercel 中已配置
2. 重新部署应用 (Redeploy)
3. 检查 API Key 是否过期

---

## 📚 相关资源

- [OpenAI SDK 文档](https://github.com/openai/node-sdk)
- [阿里云百炼文档](https://bailian.console.aliyun.com/docs)
- [DashScope 兼容模式](https://help.aliyun.com/zh/dashscope/developer-reference/quick-start)
- [Vercel 函数限制](https://vercel.com/docs/concepts/limits/overview)

---

## ✨ 总结

| 特性 | OpenAI 兼容 | 直接 API 调用 |
|------|-----------|------------|
| 代码简洁度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 错误处理 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 流式支持 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Vercel 适配 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 文档完整性 | ⭐⭐⭐⭐⭐ | ⭐⭐ |

**推荐方案**: 使用 OpenAI 兼容模式 ✅

---

**最后更新**: 2026-01-11  
**推荐环境**: Vercel + Next.js  
**最小依赖**: `openai@^4.0.0`
