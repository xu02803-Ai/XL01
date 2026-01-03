# AI Hub - 操作参考卡片

快速参考卡片，用于快速查看所有操作。

## 📌 快速链接

| 操作 | 文档 |
|------|------|
| 全面理解 | [AI_HUB_MIGRATION_GUIDE.md](AI_HUB_MIGRATION_GUIDE.md) |
| 前端集成 | [AI_HUB_FRONTEND_INTEGRATION.md](AI_HUB_FRONTEND_INTEGRATION.md) |
| 完成总结 | [AI_HUB_COMPLETION_SUMMARY.md](AI_HUB_COMPLETION_SUMMARY.md) |
| 源代码 | [api/ai-hub.ts](api/ai-hub.ts) |

---

## 🔗 API 端点一览

### 1. 生成新闻内容

```bash
GET /api/ai-hub?type=content
```

**功能：** 生成最新科技新闻
**方法：** GET
**返回：** JSON 数组

```json
{
  "success": true,
  "data": "[{\"headline\": \"...\", \"summary\": \"...\", \"category\": \"...\"}]"
}
```

---

### 2. 生成图片

```bash
GET /api/ai-hub?type=image&headline=YOUR_HEADLINE
```

**功能：** 为新闻生成相关图片
**方法：** GET
**参数：** 
- `headline` (必需) - 新闻标题

**返回：** 图片 URL

```json
{
  "success": true,
  "url": "https://image.pollinations.ai/...",
  "seed": "abc12345"
}
```

---

### 3. 合成语音

```bash
GET /api/ai-hub?type=speech&text=YOUR_TEXT&voice=VOICE_TYPE
```

**功能：** 将文本转换为语音
**方法：** GET
**参数：**
- `text` (必需) - 文本内容
- `voice` (必需) - `male` 或 `female`

**返回：** 音频数据

```json
{
  "success": true,
  "data": "base64_audio_data",
  "mimeType": "audio/mpeg"
}
```

---

### 4. 查看模型统计

```bash
GET /api/ai-hub?type=stats
```

**功能：** 获取模型使用统计
**方法：** GET
**返回：** 统计信息

```json
{
  "success": true,
  "models": [
    {
      "model": "gemini-2.5-flash",
      "successCount": 45,
      "errorCount": 2,
      "successRate": "95.74%"
    }
  ],
  "summary": {
    "totalRequests": 50,
    "overallSuccessRate": "96.00%"
  }
}
```

---

### 5. 重置统计

```bash
POST /api/ai-hub?type=stats
Content-Type: application/json

{
  "action": "reset"
}
```

---

### 6. 禁用模型

```bash
POST /api/ai-hub?type=stats
Content-Type: application/json

{
  "action": "disable",
  "model": "gemini-2.5-flash"
}
```

---

### 7. 启用模型

```bash
POST /api/ai-hub?type=stats
Content-Type: application/json

{
  "action": "enable",
  "model": "gemini-2.5-flash"
}
```

---

## 🔀 迁移映射表

| 旧 API | 新 API |
|--------|--------|
| `GET /api/generate-content` | `GET /api/ai-hub?type=content` |
| `GET /api/generate-image?headline=X` | `GET /api/ai-hub?type=image&headline=X` |
| `GET /api/synthesize-speech?text=X&voice=Y` | `GET /api/ai-hub?type=speech&text=X&voice=Y` |
| `GET /api/model-stats` | `GET /api/ai-hub?type=stats` |
| `POST /api/model-stats` | `POST /api/ai-hub?type=stats` |

---

## ⚡ 速查表 - JavaScript/TypeScript

### 生成内容

```javascript
const response = await fetch('/api/ai-hub?type=content');
const { success, data } = await response.json();
const newsArray = JSON.parse(data);
```

### 生成图片

```javascript
const headline = 'AI突破新高度';
const response = await fetch(
  `/api/ai-hub?type=image&headline=${encodeURIComponent(headline)}`
);
const { success, url } = await response.json();
document.createElement('img').src = url;
```

### 语音合成

```javascript
const response = await fetch(
  '/api/ai-hub?type=speech&text=Hello&voice=female'
);
const { success, data, mimeType } = await response.json();
const audio = new Audio(`data:${mimeType};base64,${data}`);
audio.play();
```

### 查看统计

```javascript
const response = await fetch('/api/ai-hub?type=stats');
const { models, summary } = await response.json();
console.log(`成功率: ${summary.overallSuccessRate}`);
```

### 重置统计

```javascript
await fetch('/api/ai-hub?type=stats', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'reset' })
});
```

---

## 🎯 curl 命令参考

### 生成内容

```bash
curl "http://localhost:3000/api/ai-hub?type=content"
```

### 生成图片

```bash
curl "http://localhost:3000/api/ai-hub?type=image&headline=AI新闻"
```

### 语音合成

```bash
curl "http://localhost:3000/api/ai-hub?type=speech&text=Hello&voice=female"
```

### 查看统计

```bash
curl "http://localhost:3000/api/ai-hub?type=stats"
```

### 重置统计

```bash
curl -X POST "http://localhost:3000/api/ai-hub?type=stats" \
  -H "Content-Type: application/json" \
  -d '{"action":"reset"}'
```

### 禁用模型

```bash
curl -X POST "http://localhost:3000/api/ai-hub?type=stats" \
  -H "Content-Type: application/json" \
  -d '{"action":"disable","model":"gemini-2.5-flash"}'
```

---

## 📊 函数数量对比

```
❌ 修改前：12 个函数
  ├─ generate-content.ts (1)
  ├─ generate-image.ts (1)
  ├─ synthesize-speech.ts (1)
  ├─ model-stats.ts (1)
  ├─ auth.ts (1)
  ├─ user.ts (1)
  ├─ news.ts (1)
  ├─ business.ts (1)
  ├─ media.ts (1)
  ├─ health.ts (1)
  ├─ diagnose.ts (1)
  └─ oauth/callback.ts (1)

✅ 修改后：9 个函数
  ├─ ai-hub.ts (1) ← 4 个功能合并
  ├─ auth.ts (1)
  ├─ user.ts (1)
  ├─ news.ts (1)
  ├─ business.ts (1)
  ├─ media.ts (1)
  ├─ health.ts (1)
  ├─ diagnose.ts (1)
  └─ oauth/callback.ts (1)

节省：3 个函数 🎊
```

---

## 🚨 常见错误

| 错误 | 原因 | 解决 |
|------|------|------|
| `404 Not Found` | 使用了旧 endpoint | 更新为 `/api/ai-hub?type=xxx` |
| `Invalid AI type` | type 参数不正确 | 使用 content, image, speech, stats |
| `URL 编码错误` | 中文未编码 | 使用 `encodeURIComponent()` |
| `CORS 错误` | 跨域请求失败 | 检查 CORS 头配置 |
| `500 Server Error` | 服务器错误 | 查看日志和错误信息 |

---

## ✅ 迁移检查清单

```
准备阶段：
  ☐ 阅读 AI_HUB_MIGRATION_GUIDE.md
  ☐ 理解新旧 endpoint 的映射关系
  ☐ 备份现有代码

代码更新：
  ☐ 搜索所有旧 API 调用
  ☐ 逐一更新为新 endpoint
  ☐ 测试每个更新后的功能

验证阶段：
  ☐ 本地测试所有功能
  ☐ 验证生成内容正常
  ☐ 验证生成图片正常
  ☐ 验证语音合成正常
  ☐ 验证模型统计正常

清理阶段：
  ☐ 删除旧的 API 文件（可选）
  ☐ 检查没有遗留的旧 endpoint 引用
  ☐ 提交代码到 git

部署阶段：
  ☐ 推送到 main 分支
  ☐ Vercel 自动部署
  ☐ 验证生产环境功能
  ☐ 检查函数数量 ≤ 12
```

---

## 🔗 资源链接

| 文档 | 用途 |
|------|------|
| [AI_HUB_MIGRATION_GUIDE.md](AI_HUB_MIGRATION_GUIDE.md) | 详细迁移指南 |
| [AI_HUB_FRONTEND_INTEGRATION.md](AI_HUB_FRONTEND_INTEGRATION.md) | 前端代码示例 |
| [AI_HUB_COMPLETION_SUMMARY.md](AI_HUB_COMPLETION_SUMMARY.md) | 完成总结 |
| [api/ai-hub.ts](api/ai-hub.ts) | 源代码 |
| [GEMINI_FALLBACK_STRATEGY.md](GEMINI_FALLBACK_STRATEGY.md) | 降级机制 |

---

**最后更新：** 2026-01-03
**版本：** v1.0
