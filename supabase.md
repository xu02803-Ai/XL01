# Supabase 设置指南

## 1. 创建 Supabase 项目

1. 访问 https://supabase.com
2. 用 GitHub 账号登录
3. 创建新项目（选择 EU 或 US 地域）
4. 记下：
   - Project URL
   - Anon Key (可公开)
   - Service Role Key (保密)

## 2. 创建数据库表

在 Supabase SQL Editor 中执行以下 SQL：

```sql
-- Users 表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions 表
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  plan VARCHAR(20) NOT NULL, -- 'free', 'basic', 'pro'
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'cancelled', 'paused'
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- API Usage 表（用于追踪使用量）
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  endpoint VARCHAR(100),
  request_count INT DEFAULT 1,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX idx_api_usage_date ON api_usage(date);
```

## 3. 启用 RLS（Row Level Security）

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Users 表策略
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT USING (auth.uid()::TEXT = id::TEXT);

-- Subscriptions 表策略  
CREATE POLICY "Users can view their own subscription"
  ON subscriptions FOR SELECT USING (user_id = auth.uid());
```

## 4. 环境变量

在 Vercel 中添加：
- `SUPABASE_URL`: Your Project URL
- `SUPABASE_ANON_KEY`: Anon Key
- `SUPABASE_SERVICE_KEY`: Service Role Key (仅在服务端使用)
- `STRIPE_SECRET_KEY`: Stripe 密钥
- `STRIPE_PUBLIC_KEY`: Stripe 公钥
- `NEXT_PUBLIC_STRIPE_KEY`: 客户端 Stripe 密钥

## 5. Stripe 设置

1. 访问 https://stripe.com
2. 创建账户
3. 获取 API keys（在 Dashboard -> Developers -> API Keys）
4. 创建三个产品：
   - Free Plan
   - Basic Plan ($9.99/month)
   - Pro Plan ($29.99/month)
