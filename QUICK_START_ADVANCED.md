# 高级功能快速入门

这份指南帮助你快速了解和使用所有新增的高级功能。

## 🚀 5分钟快速开始

### 1. 数据库迁移

```bash
# 在 Supabase SQL Editor 中执行
# 文件: /supabase/migrations/add_advanced_features.sql
```

### 2. 环境变量配置

```bash
# 在 Vercel 或本地 .env.local 中添加
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
DISCORD_CLIENT_ID=xxx
DISCORD_CLIENT_SECRET=xxx
APP_URL=https://your-domain.com
```

### 3. 安装依赖

```bash
# 后端
npm install speakeasy qrcode

# 前端（如果需要）
npm install
```

### 4. 使用示例

#### OAuth 登录

```tsx
import { useAdvancedAuth } from '../contexts/AdvancedAuthContext';
import { OAuthButtons } from '../components/OAuthButtons';

function LoginPage() {
  return <OAuthButtons />;
}
```

#### 2FA 设置

```tsx
import { Settings2FA } from '../pages/Settings2FA';

function SettingsPage() {
  return <Settings2FA />;
}
```

#### 团队管理

```tsx
import { TeamManagement } from '../pages/TeamManagement';

function TeamsPage() {
  return <TeamManagement />;
}
```

---

## 📚 功能详解

### OAuth 社交登录

**用途**: 让用户用 Google/GitHub/Discord 快速登录

**工作流程**:
1. 用户点击"Sign in with Google"
2. 重定向到 Google 登录页面
3. 用户授权
4. 重定向回应用，获得授权码
5. 后端交换授权码获取访问令牌
6. 后端获取用户信息
7. 自动创建账户或登录

**代码示例**:
```typescript
const { initiateOAuthFlow } = useAdvancedAuth();

// 发起 OAuth 流程
initiateOAuthFlow('google');
```

### 邮件验证

**用途**: 确保用户提供真实邮箱地址

**工作流程**:
1. 用户注册时发送验证邮件
2. 邮件包含验证链接（包含令牌）
3. 用户点击链接
4. 后端验证令牌
5. 标记邮箱为已验证

**代码示例**:
```typescript
const { sendVerificationEmail, verifyEmail } = useAdvancedAuth();

// 发送验证邮件
await sendVerificationEmail();

// 验证邮箱
await verifyEmail(token);
```

### 两步验证 (2FA)

**用途**: 增强账户安全，防止未授权登录

**工作流程**:
1. 用户进入设置页面
2. 点击"启用 2FA"
3. 系统生成 TOTP 密钥和 QR 代码
4. 用户用认证器应用扫描 QR 码
5. 系统生成 10 个恢复码
6. 用户输入认证器中的 6 位代码确认
7. 2FA 启用

**登录时**:
1. 输入用户名和密码
2. 系统要求输入 2FA 代码
3. 用户从认证器应用复制代码
4. 验证成功，登录

**代码示例**:
```typescript
const { enable2FA, verify2FA, validate2FA, disable2FA } = useAdvancedAuth();

// 启用 2FA
const setup = await enable2FA();
console.log(setup.qrCode);      // QR 代码
console.log(setup.backupCodes);  // 恢复码

// 验证初始代码
await verify2FA('123456');

// 登录时验证
const result = await validate2FA('123456');
console.log(result.usedBackupCode); // 是否使用了恢复码
```

### 折扣代码管理

**用途**: 为用户提供折扣，促进订阅升级

**工作流程**:
1. 管理员创建折扣代码
2. 用户在升级订阅时输入代码
3. 系统验证代码
4. 如果有效，应用折扣
5. 记录使用记录

**代码示例**:
```typescript
const { validateCoupon, applyCoupon } = useAdvancedAuth();

// 验证折扣代码
try {
  const coupon = await validateCoupon('SAVE20', 'basic');
  console.log(`Save ${coupon.discount_value}%`);
} catch (err) {
  console.log('Invalid coupon');
}

// 应用折扣
const discount = await applyCoupon(couponId, subscriptionId);
console.log(`Discount applied: $${discount}`);
```

### 团队管理

**用途**: 允许多个用户共享订阅计划和内容

**工作流程**:
1. 用户创建团队
2. 团队所有者邀请成员
3. 成员接受邀请
4. 成员加入团队
5. 所有者可管理成员角色

**代码示例**:
```typescript
const { 
  createTeam, 
  listTeams, 
  inviteTeamMember,
  removeTeamMember,
  updateMemberRole 
} = useAdvancedAuth();

// 创建团队
const team = await createTeam('My Team', 'Team description');

// 列表团队
const teams = await listTeams();

// 邀请成员
await inviteTeamMember(teamId, 'member@example.com', 'member');

// 更新角色
await updateMemberRole(teamId, memberId, 'admin');

// 移除成员
await removeTeamMember(teamId, memberId);
```

---

## 🔧 API 端点速查表

| 操作 | 方法 | 端点 | 认证 |
|-----|------|------|------|
| OAuth 回调 | GET | `/api/oauth/callback?provider=google` | 否 |
| 发送验证邮件 | POST | `/api/email/verify?action=send` | 否 |
| 验证邮箱 | POST | `/api/email/verify?action=verify` | 否 |
| 启用 2FA | POST | `/api/2fa/setup?action=enable` | 是 |
| 验证 2FA 代码 | POST | `/api/2fa/setup?action=verify` | 是 |
| 验证登录时 2FA | POST | `/api/2fa/setup?action=validate` | 是 |
| 禁用 2FA | POST | `/api/2fa/setup?action=disable` | 是 |
| 验证折扣代码 | POST | `/api/coupons/manage?action=validate` | 否 |
| 应用折扣 | POST | `/api/coupons/manage?action=apply` | 是 |
| 创建团队 | POST | `/api/teams/manage?action=create` | 是 |
| 列表团队 | GET | `/api/teams/manage?action=list` | 是 |
| 获取团队详情 | GET | `/api/teams/manage?action=detail&teamId=xxx` | 是 |
| 邀请成员 | POST | `/api/teams/manage?action=invite` | 是 |
| 接受邀请 | POST | `/api/teams/manage?action=accept-invite` | 否 |
| 移除成员 | DELETE | `/api/teams/manage?action=remove-member` | 是 |
| 更新角色 | PUT | `/api/teams/manage?action=update-member-role` | 是 |

---

## 🔍 常见问题

### Q: OAuth 登录后自动创建账户吗？
**A**: 是的。如果邮箱不存在，系统会自动创建账户，邮箱自动标记为已验证。

### Q: 2FA 恢复码可以重复使用吗？
**A**: 不能。每个恢复码只能使用一次。使用后会自动删除。

### Q: 如何生成折扣代码？
**A**: 需要有有效的 JWT 令牌（管理员权限）。调用 `POST /api/coupons/manage?action=create`。

### Q: 团队成员可以看到哪些内容？
**A**: 目前，团队成员可以访问共享的订阅功能。更多权限管理可按需自定义。

### Q: 如何清除 2FA 恢复码？
**A**: 禁用 2FA 会自动清除所有恢复码。重新启用时会生成新的。

---

## 🛠️ 自定义和扩展

### 修改 TOTP 时间窗口

在 `/api/2fa/setup.ts` 中修改 `window` 参数：
```typescript
const isValid = speakeasy.totp.verify({
  secret: twoFA.secret,
  encoding: 'base32',
  token,
  window: 2,  // 改为其他值（默认 2 = 30秒容限）
});
```

### 修改验证令牌过期时间

在相应的 API 文件中修改日期计算：
```typescript
// 目前: 24小时
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

// 改为: 7天
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
```

### 修改恢复码数量

在 `/api/2fa/setup.ts` 中：
```typescript
// 目前: 10 个
const backupCodes = Array.from({ length: 10 }, () =>
  crypto.randomBytes(4).toString('hex').toUpperCase()
);

// 改为: 20 个
const backupCodes = Array.from({ length: 20 }, () =>
  crypto.randomBytes(4).toString('hex').toUpperCase()
);
```

---

## 📊 性能优化建议

1. **缓存 OAuth 提供商列表**
   ```typescript
   const cachedProviders = useMemo(() => [
     { id: 'google', name: 'Google' },
     { id: 'github', name: 'GitHub' },
     { id: 'discord', name: 'Discord' },
   ], []);
   ```

2. **分页加载团队列表**
   ```typescript
   // 当团队数量很多时，实现分页
   const PAGE_SIZE = 10;
   const [page, setPage] = useState(0);
   ```

3. **缓存用户的 2FA 状态**
   ```typescript
   const [has2FA, setHas2FA] = useLocalStorage('has_2fa', false);
   ```

---

## 🔐 安全清单

部署前检查：

- [ ] 所有 OAuth 客户端密钥已设置在环境变量中
- [ ] JWT_SECRET 长度 > 32 字符
- [ ] HTTPS 在生产环境启用
- [ ] 速率限制已配置
- [ ] 邮件服务已集成
- [ ] 审计日志正常工作
- [ ] RLS 策略已验证
- [ ] 敏感错误信息已隐藏

---

## 📞 获取帮助

- 完整文档: `ADVANCED_FEATURES.md`
- 部署指南: `DEPLOYMENT_CHECKLIST.md`
- 认证文档: `AUTHENTICATION_COMPLETE.md`
- 故障排除: `DEBUGGING_AUTH.md`

---

## 🎉 下一步

现在你可以：

1. ✅ 部署高级功能
2. ✅ 集成前端组件
3. ✅ 配置 OAuth 应用
4. ✅ 设置邮件服务
5. ✅ 测试所有功能
6. ✅ 监控和优化

开始构建你的应用吧！🚀

