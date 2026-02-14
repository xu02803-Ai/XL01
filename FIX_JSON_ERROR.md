# JSON 解析错误修复指南

## 问题描述
```
Oops, something went wrong
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

## 根本原因
当您看到这个错误时，意味着:
1. ✅ 前端成功发送请求到后端 API
2. ❌ 后端返回了 **HTML 错误页面** 而不是 JSON
3. ❌ 前端尝试解析 HTML 为 JSON，导致失败

## 已完成的修复

### 1. ✅ 创建缺失的 API 处理器
**文件**: `/api/ai-handler.ts` (已创建)
- 统一处理所有 AI 相关的 API 请求
- 支持 `action=text|news|image|speech`
- 包含自动降级机制（当 API 失败时尝试备选模型）
- 完整的错误处理

### 2. ✅ 改进前端错误处理
**文件**: `每日科技脉搏 app/services/geminiService.ts`
- 提供更详细的错误日志
- 防止 JSON 解析字符串错误
- 更好的异常捕获

### 3. ✅ 增强用户错误消息
**文件**: `每日科技脉搏 app/MainApp.tsx`
- 用户友好的中文错误提示
- 指引用户查看控制台调试信息
- 区分不同类型的错误

### 4. ✅ 更新环境变量文档
**文件**: `.env.example`
- 添加 `GOOGLE_AI_API_KEY` 配置说明

---

## 需要您采取的行动

### ⚠️ 关键步骤 1: 设置 Google AI API Key

1. **访问**: https://aistudio.google.com/app/apikey
2. **生成密钥**: 点击 "Create API Key" 按钮
3. **复制密钥**: 复制生成的 API 密钥

### 📝 步骤 2: 配置环境变量

#### 选项 A: Vercel 部署 (推荐)
1. 登录 Vercel Dashboard
2. 进入您的项目 → Settings → Environment Variables
3. 添加新变量:
   - **Key**: `GOOGLE_AI_API_KEY`
   - **Value**: 您复制的 API 密钥
4. 点击 "Add"
5. 重新部署项目 (更改后自动触发或手动部署)

#### 选项 B: 本地开发
在根目录创建 `.env.local` 文件:
```env
GOOGLE_AI_API_KEY=your_api_key_here
```

### 📦 步骤 3: 重新构建 (可选但推荐)

```bash
# 安装依赖
npm install

# 前端应用
cd 每日科技脉搏\ app
npm install

# 返回根目录
cd ..
```

### 🚀 步骤 4: 测试

在浏览器控制台测试 API 调用:
```javascript
// 打开浏览器开发者工具 (F12)
// 在控制台中粘贴:
fetch('/api/ai-handler?action=text&dateStr=2024-02-14')
  .then(r => r.json())
  .then(data => console.log(data))
  .catch(e => console.error('Error:', e))
```

---

## 调试技巧

### 检查 API 是否正常工作

**在浏览器中打开**:
```
http://localhost:3000/api/health
```

**或在终端中**:
```bash
curl http://localhost:3000/api/ai-handler?action=text -v
```

### 查看详细错误日志

1. **打开浏览器开发者工具**: F12
2. **切换到 Console 标签页**
3. **刷新页面** (F5)
4. 查找以下前缀的消息:
   - 🔄 = 请求信息
   - ✅ = 成功信息
   - ❌ = 错误信息
   - 📨 = API 响应信息

### 常见错误及解决方案

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `❌ GOOGLE_AI_API_KEY not configured` | 环境变量未设置 | 按上面的步骤 2 设置 |
| `API Error 404` | `/api/ai-handler` 端点不存在 | 确保文件已创建 |
| `API Error 500` | 服务器错误 | 检查 API 日志和环境变量 |
| `Invalid JSON response` | API 返回格式错误 | 检查 Gemini API 状态 |
| `rate limit exceeded` | API 调用频率过高 | 等待后重试 |

---

## 验证清单

- [ ] 从 Google AI Studio 获得了 API 密钥
- [ ] 在 Vercel 环境变量中设置了 `GOOGLE_AI_API_KEY`
- [ ] 重新部署了应用 (如果在 Vercel)
- [ ] 打开浏览器控制台查看日志消息
- [ ] 测试生成新闻功能

---

## 如果问题仍然存在

请尝试:

1. **清除浏览器缓存**
   - Ctrl+Shift+Delete (Windows) 或 Cmd+Shift+Delete (Mac)
   - 选择"所有时间"

2. **检查 Vercel 部署日志**
   - 访问 Vercel Dashboard
   - 点击项目 → Deployments
   - 查看最新部署的 Build Logs 和 Runtime Logs

3. **测试 API 直接调用**
   ```bash
   curl -i https://your-app.vercel.app/api/ai-handler?action=news
   ```

4. **收集日志信息**
   - 打开浏览器开发者工具 (F12)
   - 重现错误
   - 复制所有控制台消息
   - 检查 Network 标签页中的 API 请求
   - 查看响应内容

---

## 相关文档

- [Gemini API 文档](https://ai.google.dev/)
- [Vercel 环境变量设置](https://vercel.com/docs/concepts/projects/environment-variables)
- [TypeScript 类型检查](./tsconfig.json)

---

**最后更新**: 2024-02-14 09:00 UTC (修复 JSON 解析错误)
