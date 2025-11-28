# 高级功能部署清单

这份清单确保所有高级功能正确部署并集成到系统中。

## 📋 预部署检查

- [ ] 所有代码已提交到 Git
- [ ] 环境变量已在 Vercel 配置
- [ ] Supabase 数据库已备份
- [ ] 团队成员已通知部署计划

## 🔄 数据库迁移步骤

### 第一步：执行 Supabase 迁移

在 Supabase 仪表板中：

1. 打开 "SQL Editor"
2. 创建新查询
3. 复制 `/supabase/migrations/add_advanced_features.sql` 的所有内容
4. 执行查询

**预期结果**:
```
CREATE TABLE
CREATE INDEX (x12)
ALTER TABLE
CREATE TRIGGER (x4)
CREATE POLICY (x9)
```

### 第二步：验证表结构

运行以下查询验证所有表已创建：

```sql
-- 检查所有新表
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'oauth_providers',
  'email_verifications',
  'two_factor_auth',
  'coupons',
  'coupon_usage',
  'teams',
  'team_members',
  'team_invitations',
  'audit_logs'
);
```

预期返回 9 行。

### 第三步：检查索引

```sql
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN (
  'oauth_providers',
  'email_verifications',
  'two_factor_auth',
  'coupons',
  'coupon_usage',
  'teams',
  'team_members',
  'team_invitations',
  'audit_logs'
);
```

预期返回 22+ 个索引。

## 🔐 环境变量配置

### Vercel 部署

在 Vercel Dashboard > Settings > Environment Variables 中添加：

```
# 必需
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
JWT_SECRET=your-secret-key-min-32-chars

# OAuth (Google)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# OAuth (GitHub)
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# OAuth (Discord)  
DISCORD_CLIENT_ID=xxx
DISCORD_CLIENT_SECRET=xxx

# 可选（邮件服务）
RESEND_API_KEY=xxx
SENDGRID_API_KEY=xxx

# 应用配置
APP_URL=https://your-domain.com
```

### 本地开发 (.env.local)

```bash
# 复制 .env.example 并更新
cp .env.example .env.local

# 编辑 .env.local 并填入本地值
```

## 📦 依赖安装

### 后端依赖

```bash
cd /workspaces/XL01
npm install
```

新增依赖：
- `speakeasy@^2.0.0` - TOTP 生成和验证
- `qrcode@^1.5.3` - QR 代码生成

### 前端依赖

```bash
cd "/workspaces/XL01/每日科技脉搏 app"
npm install
```

## 🧪 测试端点

### 1. OAuth 回调测试

```bash
curl -X GET "http://localhost:3000/api/oauth/callback?provider=google&code=test&state=test"
```

期望：环境变量缺失的错误（开发环境正常）

### 2. 邮件验证测试

```bash
curl -X POST "http://localhost:3000/api/email/verify?action=send" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","userId":"uuid"}'
```

期望：成功响应，包含验证链接（开发环境）

### 3. 2FA 设置测试

```bash
curl -X POST "http://localhost:3000/api/2fa/setup?action=enable" \
  -H "Content-Type: application/json" \
  -d '{"userId":"uuid"}'
```

期望：成功响应，包含 QR 码和恢复码

### 4. 折扣代码验证测试

```bash
curl -X POST "http://localhost:3000/api/coupons/manage?action=validate" \
  -H "Content-Type: application/json" \
  -d '{"code":"SAVE20","userId":"uuid","planId":"basic"}'
```

期望：折扣代码无效（开发环境）或有效的响应

### 5. 团队创建测试

```bash
curl -X POST "http://localhost:3000/api/teams/manage?action=create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {jwt_token}" \
  -d '{"name":"Test Team","description":"Testing"}'
```

期望：成功创建团队

## 🚀 部署流程

### 1. 本地验证

```bash
# 构建前端
cd "/workspaces/XL01/每日科技脉搏 app"
npm run build

# 检查编译错误
echo $?  # 应该是 0
```

### 2. Git 提交和推送

```bash
cd /workspaces/XL01
git add -A
git commit -m "feat: Add advanced features (OAuth, 2FA, coupons, teams)"
git push origin main
```

### 3. Vercel 自动部署

- Vercel 会自动部署新推送
- 检查 Vercel Dashboard 的 Deployments 标签

### 4. 验证部署

```bash
# 检查生产端点
curl -I https://your-domain.com/api/oauth/callback?provider=google&code=test
```

期望：HTTP 200 或 400（取决于参数）

## 📝 数据库备份和恢复

### 备份

```bash
# 在 Supabase 仪表板
Settings > Database > Backups > Create backup
```

### 恢复

```bash
# 如果出现问题
Settings > Database > Backups > Restore
```

## 🔍 监控和日志

### 查看 API 日志

```bash
# Vercel Functions 日志
vercel logs --tail

# Supabase 日志
在 Supabase Dashboard > Logs 查看
```

### 审计日志查询

```sql
-- 查看所有用户活动
SELECT * FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 100;

-- 查看特定用户的活动
SELECT * FROM audit_logs 
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC;

-- 查看团队活动
SELECT * FROM audit_logs 
WHERE team_id = 'team-uuid'
ORDER BY created_at DESC;
```

## 🐛 常见问题排除

### 问题：OAuth 端点返回 500 错误

**检查**：
```sql
-- 验证 oauth_providers 表存在
SELECT * FROM oauth_providers LIMIT 1;
```

**解决**：
1. 重新运行迁移脚本
2. 检查 Supabase 连接
3. 查看 Vercel 函数日志

### 问题：2FA QR 码不显示

**原因**：qrcode 包未安装

**解决**：
```bash
npm install qrcode@^1.5.3
```

### 问题：邀请链接不工作

**原因**：APP_URL 环境变量不正确

**解决**：
1. 验证 `APP_URL` 在 Vercel 中设置正确
2. 检查 `valid_until` 时间（可能已过期）

### 问题：折扣代码验证失败

**检查**：
```sql
-- 查看折扣代码
SELECT * FROM coupons WHERE code = 'SAVE20';

-- 检查有效期
SELECT code, valid_from, valid_until 
FROM coupons 
WHERE NOW() BETWEEN valid_from AND valid_until;
```

## ✅ 部署后清单

部署完成后，验证以下功能：

- [ ] 用户可以通过传统方式注册和登录
- [ ] OAuth 登录可用（Google/GitHub/Discord）
- [ ] 邮件验证工作（开发环境可见验证链接）
- [ ] 2FA 可以启用和禁用
- [ ] 折扣代码可以创建和验证
- [ ] 团队可以创建
- [ ] 可以邀请团队成员
- [ ] 审计日志记录所有操作

## 📊 性能基准

### 预期响应时间

| 操作 | 时间 |
|-----|------|
| OAuth 回调 | <2s |
| 2FA 验证 | <200ms |
| 折扣验证 | <200ms |
| 团队创建 | <500ms |
| 成员邀请 | <500ms |

## 🔐 安全审计

### 前部署检查

- [ ] 所有密钥未提交到 Git
- [ ] JWT 密钥长度 > 32 字符
- [ ] HTTPS 在生产环境启用
- [ ] RLS 策略正确配置
- [ ] 敏感操作需要认证
- [ ] 审计日志启用

### 代码审查

- [ ] 输入验证完成
- [ ] SQL 注入防护（使用 Supabase SDK）
- [ ] CORS 正确配置
- [ ] 错误处理不泄露敏感信息

## 📞 支持和文档

- 详见 `ADVANCED_FEATURES.md` 获取完整的功能文档
- 详见 `AUTHENTICATION_COMPLETE.md` 获取基本认证文档
- 查看 `DEBUGGING_AUTH.md` 了解故障排除步骤

## 后续任务

- [ ] 实现邮件服务集成（Resend/SendGrid）
- [ ] 添加速率限制
- [ ] 前端 OAuth 按钮 UI
- [ ] 2FA 设置页面
- [ ] 团队管理仪表板
- [ ] 审计日志查看器
- [ ] 管理员面板

---

**部署日期**: ________________

**部署人员**: ________________

**验证人员**: ________________

**备注**:

