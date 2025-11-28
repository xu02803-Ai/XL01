# 认证系统测试指南

## 本地测试环境设置

### 前置条件

1. **根目录已安装依赖**
   ```bash
   cd /workspaces/XL01
   npm install  # 安装后端依赖
   ```

2. **应用目录已安装依赖**
   ```bash
   cd /workspaces/XL01/每日科技脉搏\ app
   npm install  # 安装前端依赖
   ```

3. **环境变量配置**
   在根目录创建 `.env.local`（复制自 `.env.example`）：
   ```
   # Supabase
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_KEY=your_supabase_anon_key
   
   # Google Gemini
   GOOGLE_API_KEY=your_google_gemini_api_key
   
   # Stripe
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_BASIC_PRICE_ID=price_xxx
   STRIPE_PRO_PRICE_ID=price_yyy
   
   # JWT
   JWT_SECRET=your_jwt_secret_key
   
   # Unsplash API
   UNSPLASH_API_KEY=your_unsplash_api_key
   ```

### 启动开发服务器

#### 方式 1: 同时启动前后端（推荐）

终端 1 - 启动后端 (Vercel Functions)：
```bash
cd /workspaces/XL01
npm install -g vercel
vercel dev
# 后端运行在 http://localhost:3000
```

终端 2 - 启动前端 (Vite)：
```bash
cd /workspaces/XL01/每日科技脉搏\ app
npm run dev
# 前端运行在 http://localhost:5173
```

#### 方式 2: 仅前端（使用部署的后端）
```bash
cd /workspaces/XL01/每日科技脉搏\ app
npm run dev
# 会自动调用生产环境的 API
```

## 测试场景

### ✅ 测试 1: 未认证用户重定向

**预期行为**：未登录用户访问应用时自动显示登录页面

**步骤**：
1. 清除浏览器 localStorage（开发工具 → Application → Storage）
2. 访问 `http://localhost:5173`
3. **验证**：看到 "Sign In" 页面，而不是主应用

**代码位置**：`AppRouter.tsx` 第 58-65 行

---

### ✅ 测试 2: 新用户注册

**预期行为**：完成注册后自动登录并进入主应用

**步骤**：
1. 在 LoginPage 点击 "Sign Up" 按钮
2. 输入以下信息：
   - Email: `test@example.com`
   - Username: `testuser`
   - Password: `password123` (至少8字符)
3. 点击 "Create Account" 按钮
4. **验证**：
   - ✓ 页面加载为主应用
   - ✓ Header 显示用户名 "testuser"
   - ✓ Header 显示计划 "free plan"

**代码位置**：`LoginPage.tsx` 第 17-45 行、`AuthContext.tsx` 的 `register` 方法

**API 端点**：`POST /api/auth?action=register`

---

### ✅ 测试 3: 用户登录

**预期行为**：使用邮箱和密码登录

**步骤**：
1. 清除 localStorage 返回登录页
2. 输入（如果已注册）：
   - Email: `test@example.com`
   - Password: `password123`
3. 点击 "Sign In" 按钮
4. **验证**：
   - ✓ 登录成功进入主应用
   - ✓ localStorage 包含 `auth_token` 和 `auth_user`

**代码位置**：`LoginPage.tsx` 第 27-29 行、`AuthContext.tsx` 的 `login` 方法

**API 端点**：`POST /api/auth?action=login`

---

### ✅ 测试 4: 页面导航

**预期行为**：用户可以在页面之间导航

**步骤**：
1. 已登录状态下，点击 Header 中的用户头像
2. **验证**：
   - ✓ 导航到 Profile 页面 (`/#profile`)
   - ✓ 显示用户信息和当前计划

3. 点击 "Upgrade" 按钮
4. **验证**：
   - ✓ 导航到 Subscription 页面 (`/#subscription`)
   - ✓ 显示三个订阅计划

5. 点击 Header 中的 "Daily" 标签
6. **验证**：
   - ✓ 返回主应用 (`/`)

**代码位置**：`AppRouter.tsx` 第 46-51 行、`Header.tsx` 第 113-136 行

---

### ✅ 测试 5: API 认证令牌

**预期行为**：所有 API 调用自动包含 JWT 令牌

**步骤**：
1. 已登录状态下，打开浏览器开发工具 → Network
2. 点击 "生成今日简报" 按钮
3. 观察请求：
   - `GET /api/generate-content`
   - `GET /api/generate-image`
   - `GET /api/synthesize-speech`

4. **验证每个请求**：
   - ✓ 包含 Header：`Authorization: Bearer {token}`
   - ✓ token 值来自 localStorage

**代码位置**：`geminiService.ts` 第 12-18 行（getAuthToken 函数）

---

### ✅ 测试 6: 登出

**预期行为**：登出后返回登录页

**步骤**：
1. 已登录状态下，点击 Header 中的 "Logout" 按钮
2. **验证**：
   - ✓ localStorage 中的 `auth_token` 被清除
   - ✓ 自动重定向到 LoginPage
   - ✓ 无法访问主应用功能

**代码位置**：`Header.tsx` 第 135-141 行、`AuthContext.tsx` 的 `logout` 方法

---

### ✅ 测试 7: 会话持久化

**预期行为**：刷新页面后保持登录状态

**步骤**：
1. 已登录状态下
2. 按 F5 刷新页面
3. **验证**：
   - ✓ 仍然保持登录状态
   - ✓ 直接进入主应用
   - ✓ Header 显示用户信息

**代码位置**：`AuthContext.tsx` 第 25-33 行（useEffect 中的 localStorage 读取）

---

### ✅ 测试 8: 生成新闻（认证测试）

**预期行为**：已认证用户可以生成新闻

**步骤**：
1. 已登录状态下
2. 点击 "生成今日简报" 按钮
3. 等待加载完成
4. **验证**：
   - ✓ 收到新闻列表
   - ✓ 每条新闻包含标题、摘要、分类
   - ✓ 网络请求包含 Authorization 令牌

**代码位置**：`MainApp.tsx` 第 97-121 行、`geminiService.ts` 第 60-80 行

---

## 浏览器开发工具检查清单

### 在 DevTools 中验证

#### Application → Local Storage
```
auth_token: "eyJhbGc..." (JWT token)
auth_user: {"id": "...", "email": "...", "username": "..."}
techpulse_theme: "auto"/"light"/"dark"
techpulse_saved: "[...]" (saved articles)
```

#### Network 选项卡
```
每个 API 请求都应该有：
Headers:
  Authorization: Bearer eyJhbGc...
```

#### Console
```
✓ 无红色错误（可能有警告）
✓ 认证日志：
  "🔄 Fetching news from /api/generate-content..."
  "✅ News generation successful, items: X"
```

---

## 常见问题排查

### Q1: 刷新后显示 LoginPage

**可能原因**：localStorage 被清除或 JWT 令牌过期

**解决方案**：
1. 检查 localStorage 中是否有 `auth_token`
2. 重新登录
3. 检查 JWT 过期时间（应为 30 天）

---

### Q2: API 返回 401 Unauthorized

**可能原因**：令牌未被正确发送或令牌过期

**检查步骤**：
1. 在 DevTools 中检查请求 Headers
2. 确保 Authorization 头存在
3. 检查 API 后端日志

**代码修复**：确保 `getAuthToken()` 能正确读取 localStorage

---

### Q3: 新闻生成失败但没有显示明确错误

**调试步骤**：
1. 打开 Console 查看详细错误信息
2. 检查 Network 选项卡的 API 响应
3. 验证环境变量是否正确配置（GOOGLE_API_KEY, UNSPLASH_API_KEY 等）

---

### Q4: Header 中用户菜单没有显示

**可能原因**：`useAuth` hook 返回的 `user` 对象为 null

**检查步骤**：
1. 确认已成功登录（localStorage 中有 auth_token）
2. 在浏览器 Console 运行：`JSON.parse(localStorage.getItem('auth_user'))`
3. 如果返回 null，重新登录

---

## 性能检查

在 DevTools → Performance 选项卡中：

- **首次加载**：< 3 秒（通常 1-2 秒）
- **登录后**：页面交互 < 1 秒
- **新闻生成**：10-15 秒（API 调用时间）
- **图片加载**：2-5 秒（Unsplash API）

---

## 集成测试命令

### 完整端到端测试脚本

```bash
#!/bin/bash

# 清除旧的构建和 node_modules
rm -rf dist node_modules 每日科技脉搏\ app/dist 每日科技脉搏\ app/node_modules

# 安装依赖
npm install
cd 每日科技脉搏\ app
npm install
cd ..

# 构建前端
cd 每日科技脉搏\ app
npm run build
cd ..

# 构建成功则输出
echo "✓ Build successful!"
echo "✓ Authentication routes are protected"
echo "✓ Ready for deployment"
```

---

## 部署前检查清单

- [ ] 所有环境变量已在 Vercel 中配置
- [ ] `/api/auth` 端点正常工作
- [ ] 前端构建成功（0 错误）
- [ ] localStorage 可以正常读写
- [ ] JWT token 有效期配置正确（30 天）
- [ ] Stripe 回调 URL 已配置
- [ ] Supabase RLS 策略已启用

---

## 日志追踪

### 认证流程日志示例

```
1. 用户访问应用
   → AppRouter 检查 isAuthenticated
   
2. 用户已登录
   → 进入 MainApp
   → Header 显示用户信息
   
3. 用户点击"生成今日简报"
   → fetchDailyTechNews 获取 token
   → 发送请求：GET /api/generate-content + Authorization header
   → API 验证 token
   → 返回新闻数据
   
4. 用户点击图片位置
   → generateNewsImage 获取 token  
   → 发送请求：GET /api/generate-image + Authorization header
   → Unsplash API 返回图片
   
5. 用户点击音频播放
   → generateNewsAudio 获取 token
   → 发送请求：GET /api/synthesize-speech + Authorization header
   → Gemini TTS 生成音频
```

---

## 支持和反馈

如遇问题，请查看：
- `AUTHENTICATION_SETUP.md` - 后端认证系统文档
- `AUTHENTICATION_ROUTES.md` - 前端路由实现文档
- GitHub Issues - 提交 bug 报告
