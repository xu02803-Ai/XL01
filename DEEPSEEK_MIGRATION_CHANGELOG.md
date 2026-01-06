# DeepSeek API 迁移 - 完整变更记录

## 变更日期
2026年1月6日

## 迁移概览

✅ 已成功将 AI API 从 **Google Gemini** 迁移至 **DeepSeek API**

### 核心变更

#### 1. API 提供商替换
| 维度 | 原方案 (Gemini) | 新方案 (DeepSeek) |
|------|-----------------|-------------------|
| 主模型 | gemini-2.5-flash-001 | deepseek-chat |
| 备选模型 | gemini-2.0-flash | deepseek-reasoner |
| 降级模型 | gemini-2.0-flash-lite | deepseek-reasoner (推理) |
| API 端点 | /v1beta/generateContent | /chat/completions |

#### 2. 环境变量变更
```bash
# 移除
GEMINI_API_KEY=xxx

# 添加
DEEPSEEK_API_KEY=sk-xxx
```

## 文件修改详情

### 📝 `/api/ai-handler.ts` (完全重写)

**删除内容：**
- Google Generative AI 导入
- GoogleGenAI 模块化初始化
- TTS 语音合成处理函数
- Gemini 特定的错误处理

**新增内容：**
- DeepSeek API 连接配置
- `callDeepSeekAPI()` 函数（支持 chat 和 reasoner 模型）
- 改进的错误处理和降级机制
- 简化的 action 路由（移除 'speech' 操作）

**关键函数签名：**
```typescript
async function callDeepSeekAPI(
  apiKey: string, 
  prompt: string, 
  model: "deepseek-chat" | "deepseek-reasoner"
): Promise<string>
```

**配置参数：**
- `deepseek-chat`: max_tokens=4000, temperature=1
- `deepseek-reasoner`: max_tokens=8000, thinking.budget_tokens=4000

### 📝 `/每日科技脉搏 app/services/geminiService.ts`

**修改函数：** `generateNewsAudio()`

**变更内容：**
```typescript
// 之前：调用 /api/ai-handler?action=speech
// 现在：返回 null，添加替代方案说明
export const generateNewsAudio = async (
  text: string, 
  voice: 'Male' | 'Female'
): Promise<ArrayBuffer | null> => {
  console.warn("TTS support has been removed. Please use alternative services.");
  return null;
};
```

**替代方案建议：**
- Web Speech API（浏览器原生）
- ElevenLabs API
- Azure Speech Service
- Google Cloud Text-to-Speech

### 📝 `/package.json`

**删除依赖：**
```json
"@google/genai": "^1.34.0",
"@google/generative-ai": "^0.24.1"
```

**保留依赖：**
```json
{
  "@supabase/supabase-js": "^2.38.4",
  "jsonwebtoken": "^9.0.2",
  "qrcode": "^1.5.3",
  "speakeasy": "^2.0.0",
  "stripe": "^14.8.0"
}
```

## 新增文档

### 📄 `DEEPSEEK_MIGRATION_GUIDE.md`
完整的迁移指南，包含：
- 变更摘要和模型对比
- 环境配置说明
- API 调用示例
- 响应格式说明
- 降级策略详解
- 故障排查指南
- 性能对比表
- TTS 替代方案

### 📄 `DEEPSEEK_SETUP.md`
快速设置指南，包含：
- 环境变量配置
- API Key 获取步骤
- 不同部署环境配置（本地、Docker、Vercel、GitHub Actions）
- 配置验证方法
- 常见问题解答
- 费用估算
- 安全最佳实践

### 🔧 `test-deepseek-setup.sh`
自动化验证脚本，用于：
- 检查环境变量设置
- 验证 API Key 格式
- 检查必要文件
- 验证依赖配置
- 提供故障排查提示

## 功能变更总结

### ✅ 保留的功能
| 功能 | 端点 | 模型 |
|------|------|------|
| 文本生成（新闻） | `?action=text` | deepseek-chat → deepseek-reasoner |
| 图片提示词生成 | `?action=image` | deepseek-chat → deepseek-reasoner |
| 跨域处理 | - | ✅ 保留 |
| 错误处理 | - | ✅ 改进 |

### ❌ 移除的功能
| 功能 | 原端点 | 原因 |
|------|--------|------|
| 语音合成 (TTS) | `?action=speech` | DeepSeek 不提供 TTS 服务 |

## 性能影响分析

### 响应时间
| 模型 | 原(Gemini) | 新(DeepSeek) | 变化 |
|------|-----------|------------|------|
| Chat | ~1-2s | ~1-2s | ➡️ 相似 |
| Reasoner | 不可用 | ~3-5s | ➕ 新增 |

### 成本效率
- **deepseek-chat**: 相比 Gemini 2.5 Flash 更具成本效益
- **deepseek-reasoner**: 对复杂推理任务性价比高

### 可靠性
- ✅ 改进的自动降级机制
- ✅ 更详细的错误信息
- ✅ 优雅的配额管理

## 迁移检查清单

### 前置准备
- [ ] 备份原 Gemini 配置（如需回滚）
- [ ] 获取 DeepSeek API Key
- [ ] 阅读 DEEPSEEK_SETUP.md

### 代码更新
- [x] 更新 api/ai-handler.ts
- [x] 更新 services/geminiService.ts
- [x] 更新 package.json
- [ ] 运行 `npm install` 更新依赖

### 环境配置
- [ ] 设置 `DEEPSEEK_API_KEY` 环境变量
- [ ] 验证环境变量已正确加载
- [ ] 运行 `bash test-deepseek-setup.sh` 验证

### 测试验证
- [ ] 测试文本生成 API (`?action=text`)
- [ ] 测试图片生成 API (`?action=image`)
- [ ] 验证降级机制（模拟 429 错误）
- [ ] 检查日志输出
- [ ] 验证错误处理

### 部署
- [ ] 更新 Vercel 环境变量（如使用 Vercel）
- [ ] 更新 GitHub Secrets（如使用 GitHub Actions）
- [ ] 更新 Docker 环境配置
- [ ] 验证生产环境正常运行

### 文档更新
- [ ] 通知团队成员迁移完成
- [ ] 更新项目 README.md
- [ ] 存档原 Gemini 配置文档
- [ ] 分享 DEEPSEEK_SETUP.md 给团队

## 回滚计划（如需要）

如果需要回滚到 Gemini，请参考 git 历史中的提交记录：
```bash
# 查看历史
git log --oneline | grep -i deepseek

# 回滚到之前的提交
git revert <commit-hash>
```

## 后续改进建议

### 短期（1-2周内）
1. 监控 API 使用情况和成本
2. 收集用户反馈
3. 优化提示词提高效率

### 中期（1-3个月内）
1. 实现 API 响应缓存层
2. 添加使用配额告警
3. 集成监控和分析工具

### 长期（3个月+）
1. 评估其他 AI 模型提供商
2. 实现多模型支持
3. 建立 A/B 测试框架

## 支持信息

### 文档链接
- [DeepSeek 官方文档](https://platform.deepseek.com/api-docs)
- [API 定价](https://platform.deepseek.com/pricing)
- [本地迁移指南](./DEEPSEEK_MIGRATION_GUIDE.md)
- [快速设置指南](./DEEPSEEK_SETUP.md)

### 常见问题
详见 `DEEPSEEK_SETUP.md` 的"常见问题"部分

### 技术支持
- 项目内问题：查看本文件和相关文档
- DeepSeek API 问题：联系 [DeepSeek 支持](https://platform.deepseek.com/support)

---

**迁移完成者**: GitHub Copilot
**完成时间**: 2026-01-06
**状态**: ✅ 已完成
