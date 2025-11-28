# 高级功能实现指南

这份文档介绍了 TechPulse Daily 应用的所有高级功能的实现，包括社交登录、邮件验证、两步验证、折扣代码管理和团队协作。

## 目录

1. [概述](#概述)
2. [社交登录 (OAuth)](#社交登录-oauth)
3. [邮件验证 (Email Verification)](#邮件验证-email-verification)
4. [两步验证 (2FA)](#两步验证-2fa)
5. [折扣代码管理](#折扣代码管理)
6. [团队管理](#团队管理)
7. [环境变量配置](#环境变量配置)
8. [前端集成](#前端集成)
9. [测试指南](#测试指南)

---

## 概述

所有高级功能通过新建的数据库表和 API 端点实现。系统架构如下：

```
用户认证
├── 传统登录 (用户名/密码)
├── OAuth 社交登录 (Google, GitHub, Discord)
├── 邮件验证
└── 两步验证 (2FA)

订阅管理
├── 计划升级
├── 折扣代码应用
└── 支付集成

团队协作
├── 创建团队
├── 邀请成员
├── 角色权限管理
└── 审计日志
```

---

## 社交登录 (OAuth)

### 功能概述

允许用户通过 Google、GitHub 或 Discord 账户登录，快速创建账户并自动验证邮箱。

### 数据库表

#### oauth_providers
```sql
- id: UUID (主键)
- user_id: UUID (用户外键)
- provider: TEXT ('google', 'github', 'discord')
- provider_id: TEXT (社交平台的用户ID)
- provider_email: TEXT (社交平台邮箱)
- access_token: TEXT (访问令牌)
- refresh_token: TEXT (刷新令牌)
- token_expires_at: TIMESTAMPTZ (令牌过期时间)
- created_at, updated_at: TIMESTAMPTZ
```

### API 端点

**POST `/api/oauth/callback?provider=<google|github|discord>`**

请求流程：
1. 前端重定向到 OAuth 提供商
2. OAuth 提供商重定向回应用，带 `code` 和 `state`
3. 后端交换授权码获取访问令牌
4. 后端获取用户信息
5. 自动创建账户（如果不存在）或登录（如果存在）

响应示例：
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@gmail.com",
    "username": "john",
    "avatar_url": "https://..."
  },
  "subscription": { /* 订阅信息 */ },
  "token": "jwt_token",
  "isNewUser": true
}
```

### 环境变量

```bash
# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# GitHub OAuth
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# Discord OAuth
DISCORD_CLIENT_ID=xxx
DISCORD_CLIENT_SECRET=xxx

# 应用配置
APP_URL=https://yourdomain.com
```

### 前端集成步骤

1. **创建登录按钮组件**

```tsx
const handleGoogleLogin = () => {
  const clientId = 'YOUR_GOOGLE_CLIENT_ID';
  const redirectUri = `${window.location.origin}/api/oauth/callback?provider=google`;
  const scope = 'openid profile email';
  
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scope);
  
  window.location.href = authUrl.toString();
};
```

2. **处理 OAuth 回调**

```tsx
// 在 /oauth/callback 路由中
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('oauth_token');
  const user = params.get('oauth_user');
  const subscription = params.get('oauth_subscription');
  
  if (token && user) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', user);
    // 重定向到主页
    window.location.href = '/';
  }
}, []);
```

---

## 邮件验证 (Email Verification)

### 功能概述

新用户注册时发送验证邮件，确保邮箱有效。OAuth 用户自动视为已验证。

### 数据库表

#### email_verifications
```sql
- id: UUID (主键)
- user_id: UUID (用户外键)
- email: TEXT (待验证邮箱)
- token: TEXT (验证令牌，唯一)
- verified_at: TIMESTAMPTZ (验证时间)
- expires_at: TIMESTAMPTZ (过期时间，24小时)
- created_at: TIMESTAMPTZ
```

#### users (扩展字段)
```sql
- email_verified: BOOLEAN (默认 false)
- email_verified_at: TIMESTAMPTZ
```

### API 端点

**POST `/api/email/verify?action=send`**

请求体：
```json
{
  "email": "user@example.com",
  "userId": "uuid"
}
```

响应：
```json
{
  "success": true,
  "message": "Verification email sent",
  "verificationLink": "http://..." // 仅开发环境
}
```

**POST `/api/email/verify?action=verify`**

请求体：
```json
{
  "token": "xxx"
}
```

响应：
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

### 邮件服务集成

需要集成邮件服务（建议）：

- **Resend** (推荐): https://resend.com
- **SendGrid**: https://sendgrid.com
- **AWS SES**: https://aws.amazon.com/ses/
- **Mailgun**: https://www.mailgun.com

示例集成 (Resend)：

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'noreply@techpulse.com',
  to: userEmail,
  subject: 'Verify your email',
  html: `
    <h1>Welcome to TechPulse Daily!</h1>
    <p><a href="${verificationLink}">Click here to verify your email</a></p>
    <p>Link expires in 24 hours.</p>
  `,
});
```

---

## 两步验证 (2FA)

### 功能概述

基于 TOTP (Time-based One-Time Password) 的两步验证，用户使用 Google Authenticator、Authy 等应用生成验证码。

### 数据库表

#### two_factor_auth
```sql
- id: UUID (主键)
- user_id: UUID (用户外键，唯一)
- enabled: BOOLEAN (是否启用)
- secret: TEXT (Base32 编码的 TOTP 密钥)
- backup_codes: TEXT[] (恢复码)
- last_used_code: TEXT (最后使用的代码)
- last_used_at: TIMESTAMPTZ
- created_at, updated_at: TIMESTAMPTZ
```

#### users (扩展字段)
```sql
- two_factor_enabled: BOOLEAN (默认 false)
```

### API 端点

**POST `/api/2fa/setup?action=enable`**

请求体：
```json
{
  "userId": "uuid"
}
```

响应：
```json
{
  "success": true,
  "secret": "JBSWY3DPEBLW64TMMQ...",
  "qrCode": "data:image/png;base64,iVBORw0KG...",
  "backupCodes": ["ABC12345", "DEF67890", ...],
  "message": "Scan the QR code with your authenticator app"
}
```

**POST `/api/2fa/setup?action=verify`**

验证用户输入的 TOTP 代码并启用 2FA。

请求体：
```json
{
  "userId": "uuid",
  "token": "123456"
}
```

响应：
```json
{
  "success": true,
  "message": "2FA enabled successfully",
  "backupCodes": ["ABC12345", ...]
}
```

**POST `/api/2fa/setup?action=validate`**

登录时验证 2FA 代码。

请求体：
```json
{
  "userId": "uuid",
  "code": "123456"
}
```

响应：
```json
{
  "success": true,
  "message": "2FA code valid",
  "usedBackupCode": false,
  "remainingBackupCodes": 10
}
```

**POST `/api/2fa/setup?action=disable`**

禁用 2FA。

---

## 折扣代码管理

### 功能概述

管理员可以创建和管理折扣代码，用户在升级订阅时应用折扣。

### 数据库表

#### coupons
```sql
- id: UUID (主键)
- code: TEXT (折扣代码，唯一)
- description: TEXT (描述)
- discount_type: TEXT ('percentage' | 'fixed')
- discount_value: DECIMAL (折扣值)
- max_uses: INT (最大使用次数)
- used_count: INT (已使用次数)
- applicable_plans: TEXT[] (['free', 'basic', 'pro'])
- valid_from: TIMESTAMPTZ (有效期开始)
- valid_until: TIMESTAMPTZ (有效期结束)
- is_active: BOOLEAN
- created_at, updated_at: TIMESTAMPTZ
```

#### coupon_usage
```sql
- id: UUID (主键)
- coupon_id: UUID (折扣外键)
- user_id: UUID (用户外键)
- subscription_id: UUID (订阅外键)
- discount_amount: DECIMAL (折扣金额)
- used_at: TIMESTAMPTZ
```

### API 端点

**POST `/api/coupons/manage?action=validate`**

验证折扣代码是否有效。

请求体：
```json
{
  "code": "SAVE20",
  "userId": "uuid",
  "planId": "basic"
}
```

响应：
```json
{
  "success": true,
  "coupon": {
    "id": "uuid",
    "code": "SAVE20",
    "discount_type": "percentage",
    "discount_value": 20,
    "applicable_plans": ["basic", "pro"]
  },
  "message": "Save 20%!"
}
```

**POST `/api/coupons/manage?action=apply`**

应用折扣到订阅。

请求体：
```json
{
  "couponId": "uuid",
  "userId": "uuid",
  "subscriptionId": "uuid"
}
```

**POST `/api/coupons/manage?action=create`** (仅管理员)

创建新折扣代码。

请求头：
```
Authorization: Bearer {jwt_token}
```

请求体：
```json
{
  "code": "SAVE20",
  "description": "20% off basic plan",
  "discount_type": "percentage",
  "discount_value": 20,
  "max_uses": 100,
  "applicable_plans": ["basic", "pro"],
  "valid_from": "2025-11-28T00:00:00Z",
  "valid_until": "2025-12-31T23:59:59Z"
}
```

---

## 团队管理

### 功能概述

允许用户创建团队、邀请成员、管理角色权限。团队可以共享订阅计划。

### 数据库表

#### teams
```sql
- id: UUID (主键)
- owner_id: UUID (所有者外键)
- name: TEXT
- description: TEXT
- avatar_url: TEXT
- billing_email: TEXT
- max_members: INT (默认 10)
- created_at, updated_at: TIMESTAMPTZ
```

#### team_members
```sql
- id: UUID (主键)
- team_id: UUID (团队外键)
- user_id: UUID (用户外键)
- role: TEXT ('owner', 'admin', 'member')
- joined_at: TIMESTAMPTZ
- UNIQUE(team_id, user_id)
```

#### team_invitations
```sql
- id: UUID (主键)
- team_id: UUID (团队外键)
- invited_email: TEXT
- inviter_id: UUID (邀请者外键)
- role: TEXT ('admin', 'member')
- token: TEXT (邀请令牌，唯一)
- accepted: BOOLEAN
- accepted_at: TIMESTAMPTZ
- expires_at: TIMESTAMPTZ (7天)
- created_at: TIMESTAMPTZ
```

### API 端点

**POST `/api/teams/manage?action=create`**

创建新团队。

请求头：
```
Authorization: Bearer {jwt_token}
```

请求体：
```json
{
  "name": "My Team",
  "description": "Our awesome team"
}
```

**GET `/api/teams/manage?action=list`**

获取用户的所有团队。

请求头：
```
Authorization: Bearer {jwt_token}
```

响应：
```json
{
  "success": true,
  "teams": [
    {
      "id": "uuid",
      "name": "My Team",
      "owner_id": "uuid",
      "created_at": "2025-11-28T...",
      "team_members": [
        { "id": "uuid", "user_id": "uuid", "role": "owner" }
      ]
    }
  ]
}
```

**GET `/api/teams/manage?action=detail&teamId=xxx`**

获取团队详情。

**POST `/api/teams/manage?action=invite`**

邀请成员加入团队。

请求头：
```
Authorization: Bearer {jwt_token}
```

请求体：
```json
{
  "teamId": "uuid",
  "email": "newmember@example.com",
  "role": "member"
}
```

响应：
```json
{
  "success": true,
  "message": "Invitation sent",
  "inviteLink": "https://..."  // 仅开发环境
}
```

**POST `/api/teams/manage?action=accept-invite`**

接受团队邀请。

请求体：
```json
{
  "token": "xxx"
}
```

**DELETE `/api/teams/manage?action=remove-member&teamId=xxx&memberId=xxx`**

从团队移除成员（仅所有者）。

**PUT `/api/teams/manage?action=update-member-role`**

更新成员角色（仅所有者）。

请求体：
```json
{
  "teamId": "uuid",
  "memberId": "uuid",
  "role": "admin"
}
```

---

## 环境变量配置

### Vercel 部署

在 Vercel 仪表板添加以下环境变量：

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...

# 认证
JWT_SECRET=your-strong-random-secret-min-32-chars

# OAuth (Google)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# OAuth (GitHub)
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# OAuth (Discord)
DISCORD_CLIENT_ID=xxx
DISCORD_CLIENT_SECRET=xxx

# 邮件服务 (可选)
RESEND_API_KEY=xxx
# 或
SENDGRID_API_KEY=xxx

# 应用配置
APP_URL=https://your-domain.com
NODE_ENV=production
```

### 本地开发 (.env.local)

```bash
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_KEY=eyJhbGc...
JWT_SECRET=dev-secret-key

GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

DISCORD_CLIENT_ID=xxx
DISCORD_CLIENT_SECRET=xxx

APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## 前端集成

### AuthContext 更新

扩展 AuthContext 以支持新功能：

```typescript
interface AuthContextType {
  // ... 现有的
  
  // OAuth
  initiateOAuthFlow: (provider: string) => void;
  
  // 邮件验证
  sendVerificationEmail: (email: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  
  // 2FA
  enable2FA: () => Promise<{ secret: string; qrCode: string; backupCodes: string[] }>;
  verify2FA: (token: string) => Promise<void>;
  validate2FA: (code: string) => Promise<void>;
  disable2FA: () => Promise<void>;
  
  // 折扣
  validateCoupon: (code: string, planId?: string) => Promise<any>;
  applyCoupon: (couponId: string, subscriptionId: string) => Promise<void>;
  
  // 团队
  createTeam: (name: string, description?: string) => Promise<void>;
  listTeams: () => Promise<Team[]>;
  inviteTeamMember: (teamId: string, email: string, role: string) => Promise<void>;
  acceptTeamInvite: (token: string) => Promise<void>;
}
```

### UI 组件示例

**2FA 设置页面** (`Settings2FA.tsx`)

```tsx
const [qrCode, setQrCode] = useState('');
const [secret, setSecret] = useState('');
const [backupCodes, setBackupCodes] = useState<string[]>([]);
const [step, setStep] = useState<'setup' | 'verify' | 'done'>('setup');

const handleEnable = async () => {
  const result = await auth.enable2FA();
  setQrCode(result.qrCode);
  setSecret(result.secret);
  setBackupCodes(result.backupCodes);
  setStep('verify');
};

const handleVerify = async (code: string) => {
  await auth.verify2FA(code);
  setStep('done');
};

return (
  <div className="settings-2fa">
    {step === 'setup' && (
      <button onClick={handleEnable}>Enable 2FA</button>
    )}
    {step === 'verify' && (
      <>
        <img src={qrCode} alt="QR Code" />
        <input
          placeholder="Enter 6-digit code"
          onChange={(e) => {
            if (e.target.value.length === 6) {
              handleVerify(e.target.value);
            }
          }}
        />
        <div className="backup-codes">
          <h3>Backup Codes</h3>
          {backupCodes.map((code) => (
            <code key={code}>{code}</code>
          ))}
        </div>
      </>
    )}
    {step === 'done' && <p>✅ 2FA enabled successfully</p>}
  </div>
);
```

**团队邀请页面** (`TeamInvite.tsx`)

```tsx
const handleInvite = async (email: string, role: string) => {
  await auth.inviteTeamMember(teamId, email, role);
  alert('Invitation sent!');
};

return (
  <div className="team-invite">
    <input type="email" placeholder="member@example.com" />
    <select defaultValue="member">
      <option value="member">Member</option>
      <option value="admin">Admin</option>
    </select>
    <button onClick={() => handleInvite(email, role)}>Send Invite</button>
  </div>
);
```

---

## 测试指南

### 1. OAuth 测试

1. 在 Google/GitHub/Discord 创建应用
2. 设置重定向 URI: `http://localhost:3000/api/oauth/callback`
3. 更新 `.env.local` 中的凭证
4. 点击"Sign in with Google/GitHub/Discord"
5. 验证自动创建账户和邮箱验证

### 2. 邮件验证测试

1. 在开发环境，注册时会显示验证链接
2. 点击链接验证邮箱
3. 检查数据库 `email_verifications` 表中的 `verified_at`

### 3. 2FA 测试

1. 进入设置页面
2. 点击"Enable 2FA"
3. 使用 Google Authenticator 应用扫描 QR 码
4. 输入验证码
5. 保存恢复码
6. 注销并重新登录
7. 输入 2FA 代码完成认证

### 4. 折扣代码测试

1. 创建折扣代码 (需要管理员令牌)
2. 在升级订阅时输入代码
3. 验证折扣应用成功

### 5. 团队管理测试

1. 创建团队
2. 邀请另一个用户
3. 接受邀请
4. 验证成员列表
5. 更新成员角色

---

## 故障排除

### OAuth 失败

- **错误**: "Invalid client"
- **原因**: CLIENT_ID 或 CLIENT_SECRET 不匹配
- **解决**: 验证 OAuth 应用配置

- **错误**: "Redirect URI mismatch"
- **原因**: 回调 URL 不正确
- **解决**: 确保与 OAuth 应用设置一致

### 邮件未发送

- **检查**: Resend/SendGrid API 密钥
- **检查**: 邮件地址格式
- **检查**: 服务配额和信用额度

### 2FA 代码无效

- **检查**: 用户设备时间同步
- **检查**: 秘钥是否正确保存
- **使用**: 恢复码作为备用

### 团队邀请过期

- **过期时间**: 7 天
- **解决**: 重新发送邀请

---

## 安全最佳实践

1. **环境变量**: 永远不要提交到版本控制
2. **JWT 密钥**: 使用足够长和复杂的随机密钥（>32 字符）
3. **HTTPS**: 生产环境必须使用 HTTPS
4. **密码**: 使用 bcryptjs 进行哈希，最少 8 字符
5. **速率限制**: 为 OAuth 和登录端点添加速率限制
6. **审计日志**: 记录所有重要操作以便审查
7. **2FA 备份码**: 提醒用户安全保存
8. **令牌过期**: 定期轮换 OAuth 令牌

---

## 性能优化

1. **缓存**: 缓存用户和团队信息
2. **数据库索引**: 所有外键和常用查询字段已建立索引
3. **分页**: 列出团队时使用分页
4. **RLS**: 行级安全性确保数据隔离

---

## 下一步

- [ ] 集成邮件服务（Resend）
- [ ] 添加速率限制中间件
- [ ] 前端 OAuth 按钮组件
- [ ] 2FA 设置 UI
- [ ] 团队管理仪表板
- [ ] 审计日志查看器
- [ ] 管理员面板用于创建/编辑折扣代码

