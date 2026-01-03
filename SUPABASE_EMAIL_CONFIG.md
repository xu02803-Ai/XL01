# Supabase 邮箱验证配置指南

## 关键设置：禁用邮箱确认要求

为了让用户注册后能立即登录而无需验证邮箱，需要在 Supabase 后台进行以下配置：

### 步骤 1：登录 Supabase Dashboard

1. 访问 [https://supabase.com](https://supabase.com)
2. 选择你的项目
3. 点击左侧菜单的 **Authentication**（锁头图标）

### 步骤 2：进入 Email Auth 设置

1. 点击 **Settings** → **Auth Providers**
2. 找到 **Email** 部分
3. 点击展开

### 步骤 3：关闭邮箱确认要求

在 Email Auth 配置中，找到以下选项：

```
Confirm email
```

**将其切换为 OFF**（关闭）

这个选项的作用：
- ✅ OFF：用户注册后立即可以登录，无需邮箱验证
- ❌ ON：用户注册后需要点击邮箱中的验证链接才能登录

### 步骤 4：保存更改

1. 滚动到页面底部
2. 点击 **Save** 按钮
3. 等待配置更新完成

## 配置后的行为

注册时：
```json
{
  "success": true,
  "token": "eyJhbGc...", // 会立即返回 token
  "message": "Registration successful. You can now login."
}
```

登录时：
```json
{
  "success": true,
  "token": "eyJhbGc...", // 立即返回有效的 session token
  "user": {...}
}
```

## 可选：启用邮箱验证流程

如果你希望启用邮箱验证（推荐生产环境），按以下步骤：

### 1. 启用邮箱确认

在 Email Auth 配置中，将 **Confirm email** 切换为 **ON**

### 2. 配置邮箱服务

点击 **Email Templates** 配置：
- Confirmation Email（确认邮件）
- Password Reset Email（重置密码邮件）
- Magic Link Email（魔法链接邮件）

### 3. 前端处理邮箱验证

当 token 为 null 时，提示用户检查邮箱：

```typescript
// 注册响应示例
if (response.token === null) {
  showMessage('Registration successful! Please check your email to confirm your account.');
  // 重定向到确认页面
} else {
  // 直接保存 token 并跳转到主页
  localStorage.setItem('auth_token', response.token);
}
```

## 常见问题

### Q: 为什么我的 signUp 返回 token 为 null？

A: Supabase 后台启用了邮箱确认。需要用户点击邮箱链接才能生成有效的 session。

**解决方案：** 在 Dashboard 关闭 `Confirm email` 选项。

### Q: 我想要邮箱验证，但想让用户先用临时 token 登录？

A: 这是企业级需求。需要自定义前端逻辑：

```typescript
// 即使没有 session，也给用户一个临时的只读 token
const tempToken = authData.user?.id; // 用户 ID 作为临时标识
localStorage.setItem('pending_confirmation', tempToken);

// 等用户确认后，调用登录获取真正的 session token
```

### Q: signUp 和 signInWithPassword 用的是同一个 token 吗？

A: **是的！** 这就是使用官方方法的好处：
- `signUp()` 返回的 `access_token` 
- `signInWithPassword()` 返回的 `access_token`

这两个都是由 Supabase 生成的 JWT，格式和加密标准完全相同。

## 测试邮箱验证配置

### 测试 1：禁用邮箱确认（推荐快速测试）

```bash
# 注册
curl -X POST https://your-domain.vercel.app/api/auth?action=register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "username":"testuser",
    "password":"TestPassword123"
  }'

# 预期返回：token 不为 null
```

### 测试 2：启用邮箱确认

```bash
# 注册
curl -X POST https://your-domain.vercel.app/api/auth?action=register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "username":"testuser",
    "password":"TestPassword123"
  }'

# 预期返回：token 为 null，邮件中有确认链接
# 用户点击邮件链接后，才能使用邮箱 + 密码登录
```

## 生产环境建议

| 环境 | 邮箱确认 | 原因 |
|------|--------|------|
| 开发 | OFF | 快速测试，无需邮箱验证 |
| 测试 | OFF | 方便测试各种登录场景 |
| 生产 | ON | 防止虚假邮箱注册，保证用户邮箱有效 |

## 其他相关配置

### 密码策略

在 **Settings → Auth Providers → Email** 中配置：

```
Minimum password length: 8
Require special character: Optional
```

### 会话过期时间

在 **Settings → Auth Providers → JWT Expiry** 中配置：

```
Access Token Expiry: 3600 (1 小时)
Refresh Token Expiry: 604800 (7 天)
```

## 更新检查清单

部署前请确认：

- [ ] Supabase Dashboard 已配置（Email Auth 设置完成）
- [ ] 代码已更新为使用 `signUp()` 而不是 `admin.createUser()`
- [ ] 测试过注册流程
- [ ] 测试过登录流程
- [ ] 检查返回的 token 是否有效
- [ ] 验证 `public.users` 表和 Auth 系统数据同步

## 快速诊断

如果注册或登录有问题，使用这个端点诊断：

```bash
curl -X POST https://your-domain.vercel.app/api/auth?action=debug-user \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

查看返回的 `authUser.email_confirmed_at` 是否有值。
