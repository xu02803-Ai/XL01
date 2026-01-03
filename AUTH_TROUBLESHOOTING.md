# 认证系统排查指南

## 问题：登录显示 "Invalid credentials"

### 根本原因分析

这个问题通常是由于 **Supabase Auth 系统** 和 **public.users 表** 数据不同步导致的。

#### 关键概念：两层用户系统

1. **Supabase Auth 层**（身份验证）
   - 存储位置：`Authentication > Users` (在 Supabase Console 中查看)
   - 职责：管理密码、邮箱验证、会话 token
   - API：`supabase.auth.signInWithPassword()`

2. **public.users 表**（应用数据）
   - 存储位置：`Database > users` table
   - 职责：存储用户元数据（username, avatar_url, 订阅信息等）
   - 注意：**不应该存储 password_hash**（Auth 已管理）

### 排查步骤

#### 第一步：检查用户是否在 Auth 系统中

```bash
# 调用诊断端点
curl -X POST https://your-domain.vercel.app/api/auth?action=debug-user \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

返回结果示例：
```json
{
  "success": true,
  "debug": {
    "email": "user@example.com",
    "authUser": {
      "id": "uuid-here",
      "email": "user@example.com",
      "email_confirmed_at": "2026-01-03T10:00:00Z",
      "last_sign_in_at": "2026-01-03T10:05:00Z"
    },
    "publicUser": {
      "id": "uuid-here",
      "email": "user@example.com",
      "username": "john",
      "avatar_url": null
    }
  }
}
```

**关键检查点：**
- ✅ `authUser` 不是 `"NOT FOUND IN AUTH"` → 用户在 Auth 系统中
- ✅ `email_confirmed_at` 有值 → 邮箱已确认
- ✅ `publicUser` 不是 `"NOT FOUND IN PUBLIC.USERS"` → 用户信息同步了

#### 第二步：常见问题及解决

##### 问题 1：authUser 为 "NOT FOUND IN AUTH"

**原因：** 用户只存在于 `public.users` 表，但不在 Supabase Auth 系统中

**解决方案：**

```bash
# 使用 Supabase Console:
1. 进入 Authentication > Users
2. 点击"Create a new user"
3. 输入邮箱和密码
4. 确保勾选"Auto confirm user"
5. 创建后调用同步端点：

curl -X POST https://your-domain.vercel.app/api/auth?action=sync-auth-user \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","username":"john"}'
```

##### 问题 2：email_confirmed_at 为 null

**原因：** 用户邮箱未确认

**解决方案：**

在 Supabase Console 中：
1. 进入 `Authentication > Users`
2. 找到该用户
3. 点击用户，查看 `Email Confirmed At` 字段
4. 如果为空，点击"Confirm Identity"

或者重新注册（现在的代码已自动确认邮箱）。

##### 问题 3：publicUser 为 "NOT FOUND IN PUBLIC.USERS"

**原因：** Auth 中有用户，但 `public.users` 表中没有对应数据

**解决方案：**

```bash
curl -X POST https://your-domain.vercel.app/api/auth?action=sync-auth-user \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","username":"john"}'
```

这个端点会：
1. 在 Auth 系统中查找用户
2. 将用户数据同步到 `public.users` 表
3. 返回同步结果

#### 第三步：验证登录

```bash
curl -X POST https://your-domain.vercel.app/api/auth?action=login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

成功返回：
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "john"
  },
  "token": "jwt-token-here"
}
```

### 完整排查流程

```
1. 尝试登录
   ├─ 收到 "Invalid credentials"
   │
2. 调用 debug-user 端点
   ├─ authUser 存在？
   │  ├─ 否 → 转到 "问题 1"
   │  └─ 是 → 检查 email_confirmed_at
   │
   ├─ email_confirmed_at 有值？
   │  ├─ 否 → 转到 "问题 2"
   │  └─ 是 → 检查 publicUser
   │
   └─ publicUser 存在？
      ├─ 否 → 转到 "问题 3"
      └─ 是 → 再试一次登录（可能是网络问题）
```

### 数据库表结构参考

#### users 表（public.users）
```sql
id UUID PRIMARY KEY
email VARCHAR(255) UNIQUE
username VARCHAR(50) UNIQUE
avatar_url TEXT
email_verified BOOLEAN
email_verified_at TIMESTAMPTZ
two_factor_enabled BOOLEAN
created_at TIMESTAMP
updated_at TIMESTAMP
-- 注意：不存储 password_hash（由 Auth 管理）
```

#### two_factor_auth 表
```sql
id UUID PRIMARY KEY
user_id UUID (UNIQUE, references users)
enabled BOOLEAN
secret TEXT (Base32 TOTP secret)
backup_codes TEXT[]
created_at TIMESTAMP
updated_at TIMESTAMP
```

### 重新注册流程

如果以上步骤都不行，最简单的解决方案是：

1. **删除旧账户**（可选，如果 Auth 和 public.users 都有）
   ```sql
   -- 在 Supabase SQL Editor 执行
   DELETE FROM public.users WHERE email = 'user@example.com';
   ```

2. **在 Supabase Console 删除 Auth 用户**
   - 进入 `Authentication > Users`
   - 找到用户，点击"Delete User"

3. **重新注册**
   ```bash
   curl -X POST https://your-domain.vercel.app/api/auth?action=register \
     -H "Content-Type: application/json" \
     -d '{
       "email":"user@example.com",
       "username":"john",
       "password":"securepassword123"
     }'
   ```

4. **验证**
   ```bash
   # 调用 debug-user 确保两个系统都有数据
   curl -X POST https://your-domain.vercel.app/api/auth?action=debug-user \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com"}'
   ```

### 关键要点总结

✅ **DO（应该做）**
- 使用 Supabase Auth 管理密码验证
- 使用 `public.users` 表存储用户元数据
- 注册时确保 `email_confirm: true`
- 定期检查数据同步状态

❌ **DON'T（不应该做）**
- 在 `public.users` 表中存储 `password_hash`
- 手动 bcrypt 加密密码后再用 Supabase Auth
- 混用 Auth 验证和 `public.users` 直接查询
- 假设数据会自动同步

### 需要帮助？

1. 检查 Vercel 部署日志
2. 查看 Supabase 监控面板的错误
3. 调用 debug-user 端点获取详细信息
4. 检查浏览器网络请求（F12 → Network）
