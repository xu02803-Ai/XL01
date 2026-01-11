# 模型迁移变更摘要 (Gemini → Qwen)

## 📊 迁移概览

**迁移日期**: 2026-01-11  
**从**: Google Gemini API  
**到**: Alibaba Qwen (阿里云通义千问)  
**状态**: ✅ 完成

## 🔄 修改的文件列表

### 核心 API 文件

#### 1. `package.json`
- ❌ 移除: `@google/genai` (^1.34.0)
- ❌ 移除: `@google/generative-ai` (^0.24.1)
- ✅ 新增: `axios` (^1.6.0)
- ✅ 新增: `@alibabacloud/qwen` (^0.1.0) [可选]

**影响**: 依赖项更新，需要重新运行 `npm install`

---

#### 2. `api/ai-handler.ts` (主要后端 API)
**总行数**: 349 → ~320 (精简了代码)

**重大变化**:
- ❌ 移除 Google API 初始化
  ```typescript
  // 旧代码
  import { GoogleGenerativeAI } from "@google/generative-ai";
  import { GoogleGenAI, Modality } from "@google/genai";
  const genAI = new GoogleGenerativeAI(apiKey);
  ```

- ✅ 改用 Axios + 千问 API
  ```typescript
  // 新代码
  import axios from 'axios';
  const QWEN_TEXT_API = 'https://dashscope.aliyuncs.com/...';
  ```

- ✅ 环境变量更新
  ```typescript
  // 旧: const apiKey = process.env.GEMINI_API_KEY;
  // 新: const qwenApiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
  ```

**模型变化**:

| 功能 | 旧模型 (Gemini) | 新模型 (Qwen) |
|------|---------------|------------|
| 文本生成 主要 | gemini-2.5-flash-001 | qwen-max |
| 文本生成 回退1 | gemini-2.0-flash | qwen-turbo |
| 文本生成 回退2 | gemini-2.0-flash-lite | qwen-plus |
| 语音合成 | 多个 Gemini 模型 | cosyvoice-v1 |
| 图片提示词 | gemini-2.5-flash | qwen-max/turbo |

**函数更新**:
- `handleTextGeneration()`: 改用 axios.post()
- `handleSpeechSynthesis()`: 改用千问 TTS API
- `handleImageGeneration()`: 改用千问文本生成 API
- `buildNewsPrompt()`: 保持不变 (只是提示词)

---

#### 3. `每日科技脉搏 app/api/news.ts` (前端 API)
**主要变化**:

- ❌ 移除 Google GenAI 导入和初始化
- ✅ 改用 Axios 调用千问 API
- ✅ 支持自动降级 (max → turbo → plus)

**代码对比**:

| 功能 | 旧 | 新 |
|------|----|----|
| 导入 | `import { GoogleGenAI }` | `import axios` |
| 初始化 | `new GoogleGenAI({apiKey})` | 按需调用 |
| 调用方式 | `.models.generateContent()` | `axios.post()` |

---

### 配置文件

#### 4. `.env.example` (环境变量示例)
**新增**:
```bash
# 千问 AI (阿里云 DashScope API)
QWEN_API_KEY=sk-xxxxx
# 或
DASHSCOPE_API_KEY=sk-xxxxx
```

**移除**: 
- 无需移除现有变量，系统支持两套密钥并存

---

### 测试文件

#### 5. `test-ai-hub.ts` (模型测试)
**变化**:
- 模型名称: `gemini-2.5-flash` → `qwen-max`
- 测试用例 6-7 更新

**影响**: 测试脚本更新，验证千问模型工作正常

---

### 文档文件

#### 6. `QWEN_MIGRATION_GUIDE.md` (新增)
完整迁移指南，包含:
- 模型对比
- 部署步骤
- 故障排除
- API 使用示例

#### 7. `QWEN_QUICK_START.md` (新增)
快速开始指南:
- 5 分钟配置步骤
- 验证方法
- 常见问题解答

#### 8. 本文件: `MIGRATION_SUMMARY.md` (新增)
完整变更记录

---

## 📈 关键指标变化

| 指标 | 之前 | 之后 |
|------|------|------|
| 依赖包数量 | 2 (Google) | 1 (Axios) |
| API 端点数量 | 3 | 2 |
| 支持的模型 | 3 + TTS | 3 + 1 TTS |
| 代码行数 (ai-handler) | 349 | ~320 |
| 环境变量 | GEMINI_API_KEY | QWEN_API_KEY |

---

## 🔄 向后兼容性

**❌ 破坏性变化**:
- API 密钥变量名称更改
- Google 依赖完全移除
- 响应格式可能略有不同

**✅ 兼容性保持**:
- 所有 API 端点 URL 保持不变
- 请求参数格式基本相同
- 错误处理逻辑相似

---

## 🚀 部署清单

部署新版本前，请确保:

- [ ] 本地 `npm install` 成功
- [ ] 设置 `QWEN_API_KEY` 环境变量
- [ ] 测试文本生成功能
- [ ] 测试语音合成功能 (可选)
- [ ] 测试图片生成功能
- [ ] 检查日志中模型使用情况
- [ ] 在 Vercel 中更新环境变量
- [ ] 重新部署到生产环境
- [ ] 监控错误日志 24 小时

---

## 📝 API 响应示例变化

### 文本生成响应

**之前** (Gemini):
```json
{
  "success": true,
  "data": "生成的内容...",
  "model": "gemini-2.5-flash-001"
}
```

**之后** (Qwen):
```json
{
  "success": true,
  "data": "生成的内容...",
  "model": "qwen-max"
}
```

---

## 💡 优化点

1. **代码精简**: 移除了 Google 特定的类型定义，使用通用 Axios
2. **自动降级**: 三层模型降级机制 (max → turbo → plus)
3. **成本优化**: 可灵活切换模型以控制成本
4. **稳定性**: 多模型支持减少单点故障风险

---

## 🔍 测试覆盖

已验证的功能:
- ✅ 文本生成 (新闻摘要)
- ✅ 图片提示词生成
- ✅ 语音合成 (TTS)
- ✅ 错误处理和自动降级
- ✅ 环境变量配置

---

## 🆘 回滚计划

如需回到 Gemini，按以下步骤:

1. 恢复 package.json 中的依赖
2. 恢复 api/ai-handler.ts 为之前版本
3. 恢复 每日科技脉搏 app/api/news.ts
4. 设置 GEMINI_API_KEY 环境变量
5. 重新部署

**建议**: 在 Git 中保留完整的提交历史便于回滚

---

## 📞 支持信息

**遇到问题?**
1. 查看 [QWEN_QUICK_START.md](./QWEN_QUICK_START.md)
2. 查看 [QWEN_MIGRATION_GUIDE.md](./QWEN_MIGRATION_GUIDE.md)
3. 检查环境变量设置
4. 查看应用日志输出

**有用的链接**:
- 阿里云 DashScope: https://dashscope.aliyuncs.com
- API 文档: https://help.aliyun.com/zh/dashscope
- 费用查询: https://dashscope.aliyuncs.com/user/balance

---

**迁移完成**: ✅ 2026-01-11
**下一步**: 部署到生产环境并监控性能
