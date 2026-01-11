# 项目架构说明

## 📐 项目结构

这是一个 **Vite + Express 混合架构**的项目，而不是 Next.js 项目。

```
/
├── api/                          # Express API 服务器
│   ├── ai-handler.ts            # 旧的 axios 实现（可选）
│   ├── qwen.ts                  # 新的 OpenAI SDK 封装
│   ├── qwen-chat.ts             # Express 路由处理
│   ├── auth.ts
│   ├── business.ts
│   └── ...其他 API
│
├── 每日科技脉搏 app/             # Vite + React 前端应用
│   ├── src/
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── supabase/                    # 数据库迁移文件
├── tsconfig.json                # 根目录 TypeScript 配置
├── vercel.json                  # Vercel 部署配置
└── package.json                 # 根目录依赖
```

## 🔧 技术栈

### 后端 API (Express)
- **框架**: Express.js
- **语言**: TypeScript
- **AI API**: OpenAI SDK (兼容千问)
- **数据库**: Supabase (PostgreSQL)

### 前端应用 (Vite)
- **框架**: React + TypeScript
- **构建工具**: Vite
- **打包位置**: `每日科技脉搏 app/dist`

### 为什么不用 Next.js？
这个项目的 API 是独立的 Express 服务，而不是 Next.js 的 API Routes。所以：
- ❌ 不需要 `next/server` 导入
- ❌ 不需要 App Router 或 Pages Router
- ✅ 使用标准的 Express 路由处理

## 🚀 API 端点

### 千问 API (OpenAI 兼容模式)

**端点**: `POST /api/qwen-chat`

**请求**:
```json
{
  "messages": [
    { "role": "user", "content": "你好" }
  ],
  "model": "qwen-plus"
}
```

**响应**:
```json
{
  "success": true,
  "message": {
    "role": "assistant",
    "content": "你好！有什么我可以帮助你的吗？"
  },
  "model": "qwen-plus",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

### 新闻生成 API

**端点**: `GET /api/news`（在前端应用中）

**响应**:
```json
{
  "success": true,
  "data": "[{\"headline\": \"...\", \"summary\": \"...\", \"category\": \"...\"}]"
}
```

## 📝 TypeScript 配置

### 根目录 `tsconfig.json`
- 针对 Express API 编译
- 不包含 Next.js 特定配置

### 前端应用 `每日科技脉搏 app/tsconfig.json`
- 独立的 Vite + React 配置

## 🎯 部署方式

### Vercel 配置 (vercel.json)

```json
{
  "buildCommand": "npm install && cd '每日科技脉搏 app' && npm run build",
  "installCommand": "npm install && cd '每日科技脉搏 app' && npm install",
  "outputDirectory": "每日科技脉搏 app/dist",
  "framework": "vite"
}
```

**部署流程**:
1. 安装根目录依赖 (`npm install`)
2. 进入前端应用目录
3. 安装前端依赖 (`npm install`)
4. 构建前端应用 (`npm run build`)
5. 输出文件到 `每日科技脉搏 app/dist`

### API 服务如何运行？

在这个架构中，API 服务有两种方式：

#### 方式 1: 本地开发
在根目录运行：
```bash
npm run dev
```
或直接启动 Express 服务器（需要检查 package.json 中的脚本）

#### 方式 2: Vercel 部署
- 前端静态文件部署在 Vercel
- API 调用需要：
  1. 部署自己的 Express 服务器（例如在 Heroku 或其他平台）
  2. 或在 Vercel Serverless Functions 中实现 API
  3. 前端通过 CORS 调用 API

**推荐**: 如果要在 Vercel 上完全部署，需要将 API 改写为 Vercel Serverless Functions 或部署到其他服务器。

## 🔑 环境变量

```bash
# 千问 API (在根目录 .env 中)
DASHSCOPE_API_KEY=sk-xxxxx

# 前端应用 (在 每日科技脉搏 app/.env 中)
REACT_APP_API_URL=http://localhost:3000
```

## ✅ 检查清单

- [x] Express API 使用 OpenAI SDK
- [x] TypeScript 配置正确（不需要 next/server）
- [x] 前端 Vite 应用独立构建
- [x] 环境变量正确配置
- [ ] 确认 API 服务器部署方式
- [ ] 前端应用与 API 服务器通信正确

## 📚 常见问题

**Q: 为什么我看不到 `app/` 或 `pages/` 目录？**
A: 因为这不是 Next.js 项目，API 是独立的 Express 服务，不使用 Next.js 的路由。

**Q: 如何测试 API？**
A:
```bash
curl -X POST http://localhost:3000/api/qwen-chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "你好"}]}'
```

**Q: 前端如何调用 API？**
A:
```typescript
const response = await fetch('/api/qwen-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: '你好' }],
    model: 'qwen-plus'
  })
});
const data = await response.json();
```

**Q: 如何在 Vercel 上部署完整应用？**
A: 需要选择以下之一：
1. 将 API 改为 Vercel Serverless Functions（使用 `api/` 目录）
2. 保持前端在 Vercel，API 部署到其他服务器
3. 迁移到 Next.js（完整的全栈框架）

## 🚀 下一步建议

1. **确认 API 部署方式** - 是在本地开发服务器还是 Vercel？
2. **配置 CORS** - 确保前端可以调用 API
3. **环境变量** - 在 Vercel 环境中配置 API 密钥
4. **测试端到端** - 验证前端 → API → 千问的完整调用链路

---

**项目类型**: Vite + Express 混合架构  
**API 框架**: Express.js  
**AI SDK**: OpenAI (兼容千问)  
**部署平台**: Vercel (前端) + 其他 (API)
