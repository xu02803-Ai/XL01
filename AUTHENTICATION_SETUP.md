# 认证和订阅系统实施指南

## 📋 系统架构

```
┌─────────────────────────────────────────────────┐
│              Frontend (React)                     │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ LoginPage    │  │ ProfilePage   │            │
│  │ SubscriptionPage                │            │
│  └──────────────┘  └──────────────┘            │
│         ↓                ↓                       │
│  ┌─────────────────────────────────┐           │
│  │  AuthContext (State Management)   │           │
│  └─────────────────────────────────┘           │
└─────────────────────────────────────────────────┘
         ↓ JWT Token in Authorization Header
┌─────────────────────────────────────────────────┐
│         Backend APIs (Node.js + Vercel)          │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ /api/auth    │  │ /api/user    │            │
│  │ (Register)   │  │ (Profile Mgmt)           │
│  │ (Login)      │  └──────────────┘            │
│  └──────────────┘                              │
│  ┌──────────────┐                              │
│  │ /api/subscription                │           │
│  │ (Plans)                          │           │
│  │ (Checkout)   │ ──→ Stripe ←──  │           │
│  │ (Cancel)     │                              │
│  └──────────────┘                              │
└─────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────┐
│    Supabase (PostgreSQL Database)                │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ users        │  │ subscriptions │            │
│  │ - id         │  │ - id         │            │
│  │ - email      │  │ - user_id    │            │
│  │ - username   │  │ - plan       │            │
│  │ - password   │  │ - status     │            │
│  │ - avatar_url │  │ - stripe_id  │            │
│  └──────────────┘  └──────────────┘            │
│  ┌──────────────┐                              │
│  │ api_usage    │                              │
│  │ (Usage tracking)                │           │
│  └──────────────┘                              │
└─────────────────────────────────────────────────┘
```

## 🚀 快速开始步骤

### 第1步：Supabase 设置（5-10 分钟）

1. **创建账户**
   - 访问 https://supabase.com
   - 用 GitHub 登录
   - 创建新项目

2. **创建数据库表**
   - 打开 SQL Editor
   - 执行 `supabase.md` 中的 SQL 脚本
   - 确认表创建成功

3. **获取 API 密钥**
   - 进入 Project Settings → API
   - 复制 "Project URL"
   - 复制 "anon public key"
   - 复制 "service_role key"

### 第2步：Stripe 设置（10-15 分钟）

1. **创建 Stripe 账户**
   - 访问 https://stripe.com
   - 创建账户并完成验证

2. **创建产品和价格**
   ```
   Basic Plan
   - 价格: $9.99/月
   - 记录 Price ID: price_xxxxx

   Pro Plan
   - 价格: $29.99/月
   - 记录 Price ID: price_xxxxx
   ```

3. **获取 API 密钥**
   - 进入 Developers → API Keys
   - 复制 "Secret Key" (sk_live_xxxxx)
   - 复制 "Publishable Key" (pk_live_xxxxx)

### 第3步：部署到 Vercel

1. **添加环境变量**
   ```
   在 Vercel 项目 Settings → Environment Variables 中添加：

   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_KEY=your_service_key
   JWT_SECRET=（使用强随机字符串）
   STRIPE_SECRET_KEY=sk_live_xxxxx
   STRIPE_PUBLIC_KEY=pk_live_xxxxx
   STRIPE_BASIC_PRICE_ID=price_xxxxx
   STRIPE_PRO_PRICE_ID=price_xxxxx
   ```

2. **重新部署**
   - 在 Vercel dashboard 点击 "Redeploy"

### 第4步：测试系统

1. **访问应用**
   - 前往 `/login` 页面
   - 点击 "Sign Up" 创建账户
   - 使用 email + password 注册

2. **测试订阅功能**
   - 进入 `/subscription` 页面
   - 选择 "Basic" 或 "Pro" 计划
   - 使用 Stripe 测试卡号：
     ```
     4242 4242 4242 4242
     任意未来日期 (如 12/25)
     任意 CVC (如 123)
     ```

3. **验证用户资料**
   - 进入 `/profile` 查看用户信息
   - 修改 username 和 avatar
   - 保存更改

## 📋 API 文档

### Authentication

#### 注册 (POST /api/auth?action=register)
```json
Request:
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securepassword"
}

Response:
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe"
  },
  "token": "jwt_token_here"
}
```

#### 登录 (POST /api/auth?action=login)
```json
Request:
{
  "email": "user@example.com",
  "password": "securepassword"
}

Response:
{
  "success": true,
  "user": { ... },
  "subscription": { ... },
  "token": "jwt_token_here"
}
```

### User Management

#### 获取资料 (GET /api/user?action=profile)
```
Headers:
Authorization: Bearer {token}

Response:
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "avatar_url": "https://...",
    "created_at": "2025-11-28..."
  }
}
```

#### 更新资料 (PUT /api/user?action=profile)
```
Headers:
Authorization: Bearer {token}

Request:
{
  "username": "newusername",
  "avatar_url": "https://..."
}
```

#### 获取订阅 (GET /api/user?action=subscription)
```
Headers:
Authorization: Bearer {token}

Response:
{
  "success": true,
  "subscription": {
    "id": "uuid",
    "plan": "pro",
    "status": "active",
    "current_period_end": "2025-12-28..."
  }
}
```

### Subscriptions

#### 获取计划列表 (GET /api/subscription?action=plans)
```
Response:
{
  "success": true,
  "plans": [
    {
      "id": "free",
      "name": "Free",
      "price": 0,
      "requests_per_day": 10
    },
    ...
  ]
}
```

#### 创建支付会话 (POST /api/subscription?action=create-checkout)
```
Headers:
Authorization: Bearer {token}

Request:
{
  "plan": "pro"
}

Response:
{
  "success": true,
  "url": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_..."
}
```

## 🔒 安全最佳实践

1. **JWT 密钥**
   - 使用强随机字符串
   - 定期轮换
   - 不要在代码中硬编码

2. **密码**
   - 使用 bcryptjs 哈希（已实现）
   - 最少 8 字符要求（已实现）
   - 传输时使用 HTTPS

3. **令牌**
   - 存储在 localStorage（客户端）
   - 在 Authorization 头中传输
   - 30 天过期时间（可调整）

4. **Stripe**
   - 使用 Secret Key（仅后端）
   - 验证 webhook 签名
   - 不在前端暴露 Secret Key

5. **Supabase**
   - 启用 Row Level Security (RLS)
   - 使用 Service Key（仅后端）
   - 定期备份

## 📊 使用量限制

| 计划 | 每日请求 | 功能 |
|------|---------|------|
| Free | 10 | 基础功能 |
| Basic | 100 | 高级功能 + 邮件支持 |
| Pro | 1000 | 所有功能 + 优先支持 + API 访问 |

## 🐛 故障排除

### 登录失败
- 检查 Supabase 连接
- 验证 JWT_SECRET 环境变量
- 检查 bcryptjs 依赖是否安装

### Stripe 支付失败
- 验证 STRIPE_SECRET_KEY
- 确保 Price ID 正确
- 检查 Stripe 账户状态

### 数据库连接错误
- 验证 SUPABASE_URL 和密钥
- 检查网络连接
- 确认表已创建

## 🔧 进一步定制

### 添加社交登录
可以集成 OAuth 提供商：
- Google OAuth
- GitHub OAuth
- Discord OAuth

### 自定义支付流程
- 添加折扣代码
- 实现月度/年度切换
- 添加发票管理

### 高级功能
- 两步验证 (2FA)
- 团队管理
- API 密钥生成
- 使用量分析仪表板

## 📞 获取帮助

- Supabase 文档: https://supabase.com/docs
- Stripe 文档: https://stripe.com/docs
- JWT 指南: https://jwt.io
