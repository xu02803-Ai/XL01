# 认证错误诊断指南

## 问题：注册显示 "A server e" 或 "不是有效的JSON"

这通常表示后端返回了 HTML 错误页面而不是 JSON。

---

## 🔍 快速诊断

### 步骤 1: 打开浏览器开发者工具

1. 按 `F12` 或右键点击 → "检查元素"
2. 选择 **Network** 选项卡
3. 清空历史记录（红色圆形 X）

### 步骤 2: 尝试注册

1. 在应用中输入注册信息
2. 点击 "Create Account"
3. **不要关闭 DevTools**

### 步骤 3: 检查网络请求

在 Network 选项卡中：
- 找到 `auth?action=register` 请求
- 点击它看详细信息
- 检查以下部分：

#### **Status 列**
```
预期值: 201 (Created)
错误值: 500, 502, 503 等
```

#### **Response 选项卡**
```
预期: JSON 格式的响应
错误: HTML 页面 (以 <!DOCTYPE> 或 <html> 开头)
```

#### **Console 选项卡**
查看完整错误日志：
```
Register response status: 500
Register response text: <!DOCTYPE html>...
Failed to parse response as JSON: SyntaxError: Unexpected token < in JSON at position 0
```

---

## 🛠️ 常见错误及解决方案

### 错误 1: `{"error": "Missing required fields"}`

**原因**：没有发送必要的字段

**检查**：
- 所有输入字段是否都填写了？
- 检查 Network 请求的 **Payload** 是否包含 email, username, password

**解决**：确保在表单中输入了所有字段

---

### 错误 2: `{"error": "User already exists"}`

**原因**：该邮箱已被注册

**检查**：
- 这个邮箱是否之前注册过？
- 尝试用不同的邮箱

**解决**：
```javascript
// 尝试用新邮箱
test+{当前时间}@example.com
test+2024011401@example.com
```

---

### 错误 3: HTML 错误页面 (状态 502, 503, 504)

**原因**：后端连接问题或部署错误

**检查步骤**：

1. **查看完整 HTML 响应**：
   - Network → auth?action=register → Response 选项卡
   - 查看是否包含错误信息

2. **常见问题**：
   - 环境变量未配置 (SUPABASE_URL, SUPABASE_SERVICE_KEY 等)
   - Supabase 连接失败
   - API 密钥过期

3. **解决方案**：

   ```bash
   # 如果使用本地 Vercel dev
   vercel dev
   
   # 查看输出中的错误
   ```

---

### 错误 4: `{"error": "Database error: ..."}` 

**原因**：Supabase 数据库操作失败

**常见原因**：
- 表不存在
- 列名错误
- RLS 策略阻止操作
- 数据类型不匹配

**调试**：
1. 登录 Supabase 仪表板
2. 检查 `users` 和 `subscriptions` 表是否存在
3. 检查列是否为：
   - `users`: id, email, username, password_hash, avatar_url, created_at, updated_at
   - `subscriptions`: id, user_id, plan, status, current_period_end

**修复**：
```sql
-- 重新创建 users 表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  username VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  avatar_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 重新创建 subscriptions 表
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  plan VARCHAR NOT NULL DEFAULT 'free',
  status VARCHAR NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### 错误 5: `SyntaxError: Unexpected token < in JSON at position 0`

**原因**：响应是 HTML 而不是 JSON

**检查**：
在 Console 中查看日志：
```
Failed to parse response as JSON: SyntaxError: Unexpected token <
```

**下一步**：
1. 在 Network 选项卡检查完整响应
2. 查找错误信息
3. 检查后端日志

---

## 📋 调试检查清单

### 前端检查

- [ ] 在 Console 中查看日志
- [ ] 在 Network 中检查请求和响应
- [ ] 验证所有输入字段都已填充
- [ ] 检查是否有 CORS 错误 (红色警告)

### 后端检查

- [ ] 所有环境变量已设置
  ```bash
  SUPABASE_URL=...
  SUPABASE_SERVICE_KEY=...
  JWT_SECRET=...
  ```

- [ ] Supabase 连接正常
  ```javascript
  // 测试连接
  curl -i -X GET \
    'https://your-project.supabase.co/rest/v1/users' \
    -H "apikey: your_key" \
    -H "Authorization: Bearer your_key"
  ```

- [ ] 数据库表存在并有正确的列

- [ ] JWT 密钥已配置（30 天过期）

- [ ] bcryptjs 包已安装
  ```bash
  npm ls bcryptjs
  ```

- [ ] jsonwebtoken 包已安装
  ```bash
  npm ls jsonwebtoken
  ```

---

## 🔧 本地测试

### 使用 curl 测试注册

```bash
curl -X POST http://localhost:3000/api/auth?action=register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'
```

**预期响应**：
```json
{
  "success": true,
  "user": {
    "id": "uuid-string",
    "email": "test@example.com",
    "username": "testuser"
  },
  "token": "eyJhbGciOi..."
}
```

**错误响应示例**：
```json
{
  "error": "User already exists"
}
```

### 使用 curl 测试登录

```bash
curl -X POST http://localhost:3000/api/auth?action=login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

---

## 📊 Vercel 日志检查

如果使用 Vercel 部署：

### 查看实时日志

```bash
# 安装 Vercel CLI
npm i -g vercel

# 查看日志
vercel logs [project-name]
vercel logs [project-name] --tail
```

### 在 Vercel 仪表板中查看

1. 访问 https://vercel.com/dashboard
2. 选择项目 "XL01"
3. 点击 "Deployments" 选项卡
4. 点击最新部署
5. 点击 "Functions" 查看日志

### 查找认证日志

查找包含以下内容的行：
```
🔐 Register request received
❌ Registration error:
✅ Registration successful
```

---

## 🎯 完整诊断流程

### 1. 清除缓存

```javascript
// 在浏览器 Console 中运行
localStorage.clear();
location.reload();
```

### 2. 尝试注册

- 使用新的邮箱地址
- 使用强密码 (至少 8 字符)
- 填写所有字段

### 3. 检查错误

在 Console 中查看以下日志：

```
✅ 成功情况：
- "Register response status: 201"
- "Register response text: {"success":true,..."

❌ 失败情况：
- "Register response status: 500"
- "Register response text: <!DOCTYPE html>..."
```

### 4. 记录信息

如果仍然失败，收集以下信息：

```
请求：
- URL: /api/auth?action=register
- Method: POST
- Headers: Content-Type: application/json
- Body: {email, username, password}

响应：
- Status Code: [状态码]
- Response Text: [前 200 个字符]
- Content-Type: [响应类型]

环境：
- 后端运行地址: localhost:3000 或 vercel
- 前端地址: localhost:5173 或 vercel
```

---

## 🚀 快速修复建议

### 方案 A: 重启后端

```bash
# 停止 vercel dev
Ctrl+C

# 清除缓存
rm -rf .vercel

# 重启
vercel dev
```

### 方案 B: 重新验证环境变量

```bash
# 检查 .env 文件
cat /workspaces/XL01/.env

# 或查看 Vercel 设置
vercel env list
```

### 方案 C: 检查数据库连接

在 Supabase 中：
1. 复制 Connection String
2. 测试连接
3. 验证权限

### 方案 D: 查看最近部署

如果在 Vercel 上：
1. 检查最近的部署是否成功
2. 检查构建日志中是否有错误
3. 检查运行时环境变量是否正确

---

## 📞 获取帮助

如果问题仍未解决，提供以下信息：

1. **完整的错误消息**（来自 Console）
2. **Network 选项卡的请求/响应**
3. **Vercel 日志**（如适用）
4. **环境变量是否配置**（不要共享实际值）
5. **最后一次成功的操作是什么**

---

## 相关文档

- `AUTHENTICATION_SETUP.md` - 后端认证系统
- `TESTING_AUTHENTICATION.md` - 完整测试指南
- `AUTHENTICATION_ROUTES.md` - 前端路由实现
