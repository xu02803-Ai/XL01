# 新闻图片修复测试指南

## 快速开始

### 1. 本地测试

```bash
# 开发环境启动
cd /workspaces/XL01
npm install

# 启动后端API服务
# (确保环境变量 GOOGLE_AI_API_KEY 已设置)

# 启动前端应用 
cd "./每日科技脉搏 app"
npm start
```

### 2. 验证修复

#### ✅ UI验证
- [ ] 浏览新闻列表页
- [ ] 所有文章都显示图片（或科技感的渐变背景）
- [ ] 图片加载时显示"正在生成图片..."
- [ ] 不显示"No Image"文本

#### ✅ 功能验证
- [ ] 刷新页面，图片仍然显示
- [ ] 点击图片所在的文章卡片，进入详情页
- [ ] 书签保存文章时，图片URL被保存
- [ ] 返回列表时，图片仍显示

#### ✅ 性能验证
- [ ] 首次加载：图片在3-5秒内显示
- [ ] 后续加载：图片在1-2秒内显示
- [ ] 浏览器控制台：无错误或警告

#### ✅ 网络验证
- [ ] 开启浏览器开发工具 Network 标签
- [ ] 查看图片请求细节
- [ ] 验证图片URL是否正确格式
- [ ] 检查响应状态码是否为200

### 3. 浏览器控制台检查

打开浏览器开发工具（F12）> Console，查看日志：

**成功示例：**
```
🖼️ Requesting image for: 苹果发布新一代AI芯片
✅ Image URL received: Pollinations.ai
```

**备用方案激活示例：**
```
🖼️ Requesting image for: OpenAI新模型发布
✅ Image URL received: Unsplash
```

**最后备用方案示例：**
```
🖼️ Requesting image for: 谷歌TensorFlow更新
✅ Image URL received: gradient-fallback
```

### 4. 测试不同场景

#### 场景1：正常网络
1. 打开网站
2. 新闻列表加载
3. 应该看到真实图片或高质量占位图
4. 验证过程：应看到 ✅ 日志

#### 场景2：网络缓慢
1. 打开开发工具 Network 标签
2. 限制网速为 Slow 3G
3. 加载新闻列表
4. 图片应在10秒内显示
5. 可能会激活不同的图片源（较低优先级）

#### 场景3：离线模式
1. 打开开发工具 Network 标签
2. 勾选"Offline"
3. 刷新页面
4. 已加载的图片应继续显示
5. 新加载的文章应显示渐变占位图

#### 场景4：API失败模拟
1. 打开开发工具 > Sources
2. 在 handleImageGeneration 处加断点
3. 验证多个源的尝试逻辑
4. 所有源都失败时，应显示SVG备用图

### 5. 按类别验证图片颜色

新闻列表中查看不同类别的文章：

- **AI 相关** → 蓝色渐变 (#4F46E5 → #3B82F6)
- **Tech 相关** → 紫蓝色渐变 (#6366F1 → #8B5CF6)  
- **芯片相关** → 橙红色渐变 (#F97316 → #EF4444)
- **能源相关** → 绿色渐变 (#16A34A → #22C55E)
- **科学相关** → 青色渐变 (#0891B2 → #06B6D4)

### 6. API端点测试

可以直接测试API端点：

```bash
# 测试图片生成 API
curl "http://localhost:3000/api/ai-handler?action=image&headline=Apple%20releases%20new%20AI%20chip&category=AI"

# 预期响应：
# {
#   "success": true,
#   "imageUrl": "https://...",
#   "source": "Pollinations.ai" | "Unsplash" | "gradient-fallback",
#   "headline": "Apple releases new AI chip"
# }
```

### 7. 性能分析

**检查图片加载时间：**
1. 打开 DevTools > Lighthouse
2. 运行 Performance 分析
3. 查看"Image elements"部分
4. 所有图片应使用有效的src属性

**检查包大小：**
```bash
cd "./每日科技脉搏 app"
npm run build  # 如果有build脚本
# 查看 dist 文件夹大小
```

### 8. 常见问题排查

#### 问题：仍显示"No Image"
**排查步骤：**
1. 检查浏览器控制台是否有错误
2. 检查API是否返回图片URL
3. 验证 GOOGLE_AI_API_KEY 环境变量是否已设置
4. 清除浏览器缓存（Ctrl+Shift+Delete）
5. 重新加载页面

#### 问题：图片显示为损坏
**排查步骤：**
1. 右键点击图片 > 在新标签页中打开
2. 检查URL是否有效
3. 查看浏览器控制台是否有CORS错误
4. 检查网络连接是否正常

#### 问题：加载时间过长
**排查步骤：**
1. 打开 Network 标签，刷新页面
2. 查看是否有失败的请求
3. 检查是否多次重试
4. 考虑配置API密钥以获得更好的速度

### 9. 提交前检查清单

- [ ] 新闻列表中所有文章都显示了图片
- [ ] 没有显示"No Image"文本
- [ ] 浏览器控制台没有错误
- [ ] 不同类别的文章显示不同颜色的占位图
- [ ] 网络缓慢时仍能正确显示
- [ ] 登录/注销后仍能正确显示
- [ ] 在不同浏览器中测试过（Chrome, Firefox, Safari）
- [ ] 手机视图中也能正确显示

## 部署验证 (Vercel)

### 预部署检查
```bash
# 1. 检查环境变量
vercel env ls

# 2. 本地模拟Vercel环境
vercel dev

# 3. 访问 http://localhost:3000/api/ai-handler?action=image&headline=test
# 应该返回成功的图片URL
```

### 部署后检查
1. 访问生产环境网站
2. 验证图片加载
3. 检查浏览器开发工具 > Network
4. 验证图片URL源是否正确
5. 查看 Vercel 日志中是否有错误

## 性能目标

| 指标 | 目标 | 实现方式 |
|------|------|--------|
| 图片显示成功率 | >95% | 多源备用 |
| 平均加载时间 | <3秒 | 并行尝试 |
| 失败处理 | 100% 优雅 | SVG备用 |
| 用户可感知 | 0 个"No Image" | 自动降级 |

## 反馈收集

测试完成后，提供反馈：
- [ ] 使用体验是否改进
- [ ] 是否还看到"No Image"
- [ ] 性能是否满足预期
- [ ] 有无建议改进之处

---

**更新时间**: 2026-02-25
**测试者**: [您的名字]
**环境**: [开发/测试/生产]
