import { createClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const jwtSecret = process.env.JWT_SECRET;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
const discordClientId = process.env.DISCORD_CLIENT_ID;
const discordClientSecret = process.env.DISCORD_CLIENT_SECRET;

const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '');

interface OAuthToken {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface GitHubUserInfo {
  id: number;
  login: string;
  email: string;
  avatar_url: string;
  name: string;
}

interface DiscordUserInfo {
  id: string;
  username: string;
  email: string;
  avatar: string;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!supabaseUrl || !supabaseServiceKey || !jwtSecret) {
    return res.status(500).json({ 
      error: 'Server configuration error: Missing environment variables' 
    });
  }

  const { provider, code, state } = req.query;

  if (!provider || !code) {
    return res.status(400).json({ error: 'Missing provider or code' });
  }

  try {
    // 验证 state 参数（防止 CSRF）
    const savedState = req.cookies?.oauth_state;
    if (!savedState || savedState !== state) {
      console.warn('❌ Invalid OAuth state:', { savedState, state });
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    let userInfo: any;
    let tokens: OAuthToken;

    switch (provider) {
      case 'google':
        ({ userInfo, tokens } = await handleGoogleCallback(code));
        break;
      case 'github':
        ({ userInfo, tokens } = await handleGithubCallback(code));
        break;
      case 'discord':
        ({ userInfo, tokens } = await handleDiscordCallback(code));
        break;
      default:
        return res.status(400).json({ error: 'Unsupported provider' });
    }

    // 检查用户是否已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', userInfo.email)
      .limit(1);

    let user = existingUser?.[0];
    let isNewUser = false;

    // 如果用户不存在，创建新用户
    if (!user) {
      console.log('👤 Creating new user from OAuth:', userInfo.email);
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([{
          email: userInfo.email,
          username: userInfo.username || userInfo.email.split('@')[0],
          avatar_url: userInfo.avatar_url,
          email_verified: true, // OAuth 邮箱已验证
          email_verified_at: new Date().toISOString(),
        }])
        .select();

      if (error || !newUser) {
        console.error('❌ Failed to create user:', error);
        return res.status(500).json({ error: 'Failed to create user' });
      }

      user = newUser[0];
      isNewUser = true;

      // 为新用户创建免费订阅
      await supabase.from('subscriptions').insert([{
        user_id: user.id,
        plan: 'free',
        status: 'active',
      }]);
    }

    // 保存/更新 OAuth 提供商记录
    const expiresAt = tokens.expires_in 
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() 
      : null;

    const { error: oauthError } = await supabase
      .from('oauth_providers')
      .upsert({
        user_id: user.id,
        provider,
        provider_id: userInfo.id,
        provider_email: userInfo.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expires_at: expiresAt,
      }, {
        onConflict: 'provider,provider_id'
      });

    if (oauthError) {
      console.error('⚠️ Failed to save OAuth provider:', oauthError);
    }

    // 生成 JWT 令牌
    const token = jwt.sign(
      { id: user.id, email: user.email },
      jwtSecret,
      { expiresIn: '30d' }
    );

    // 获取订阅信息
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);

    // 记录审计日志
    await supabase.from('audit_logs').insert([{
      user_id: user.id,
      action: `oauth_login_${provider}`,
      details: { is_new_user: isNewUser, provider_id: userInfo.id },
      ip_address: req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress,
      user_agent: req.headers['user-agent'],
    }]);

    console.log('✅ OAuth login successful:', { user: user.id, provider, isNewUser });

    // 返回认证信息 - 前端将从 query 参数中获取
    const redirectUrl = new URL(`${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`);
    redirectUrl.searchParams.set('oauth_token', token);
    redirectUrl.searchParams.set('oauth_user', JSON.stringify({
      id: user.id,
      email: user.email,
      username: user.username,
      avatar_url: user.avatar_url,
    }));
    redirectUrl.searchParams.set('oauth_subscription', JSON.stringify(subscription?.[0] || null));

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar_url: user.avatar_url,
      },
      subscription: subscription?.[0] || null,
      token,
      isNewUser,
    });
  } catch (error: any) {
    console.error('❌ OAuth callback error:', error.message);
    res.status(500).json({ 
      error: error.message || 'OAuth authentication failed' 
    });
  }
}

async function handleGoogleCallback(code: string) {
  if (!googleClientId || !googleClientSecret) {
    throw new Error('Google OAuth not configured');
  }

  // 交换授权码获取访问令牌
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: googleClientId,
      client_secret: googleClientSecret,
      redirect_uri: `${process.env.APP_URL || 'http://localhost:3000'}/api/oauth/callback?provider=google`,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to exchange Google authorization code');
  }

  const tokens = await tokenResponse.json();

  // 获取用户信息
  const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to fetch Google user info');
  }

  const googleUser = await userResponse.json() as GoogleUserInfo;

  return {
    userInfo: {
      id: googleUser.id,
      email: googleUser.email,
      username: googleUser.name?.split(' ')[0] || googleUser.email.split('@')[0],
      avatar_url: googleUser.picture,
    },
    tokens: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
    },
  };
}

async function handleGithubCallback(code: string) {
  if (!githubClientId || !githubClientSecret) {
    throw new Error('GitHub OAuth not configured');
  }

  // 交换授权码获取访问令牌
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      client_id: githubClientId,
      client_secret: githubClientSecret,
      redirect_uri: `${process.env.APP_URL || 'http://localhost:3000'}/api/oauth/callback?provider=github`,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to exchange GitHub authorization code');
  }

  const tokens = await tokenResponse.json();

  // 获取用户信息
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `token ${tokens.access_token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to fetch GitHub user info');
  }

  const githubUser = await userResponse.json() as GitHubUserInfo;

  return {
    userInfo: {
      id: githubUser.id.toString(),
      email: githubUser.email,
      username: githubUser.login,
      avatar_url: githubUser.avatar_url,
    },
    tokens: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || '',
      expires_in: tokens.expires_in,
    },
  };
}

async function handleDiscordCallback(code: string) {
  if (!discordClientId || !discordClientSecret) {
    throw new Error('Discord OAuth not configured');
  }

  // 交换授权码获取访问令牌
  const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: discordClientId,
      client_secret: discordClientSecret,
      redirect_uri: `${process.env.APP_URL || 'http://localhost:3000'}/api/oauth/callback?provider=discord`,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to exchange Discord authorization code');
  }

  const tokens = await tokenResponse.json();

  // 获取用户信息
  const userResponse = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to fetch Discord user info');
  }

  const discordUser = await userResponse.json() as DiscordUserInfo;

  // Discord 不一定提供邮箱，需要请求邮箱权限
  const email = discordUser.email || `${discordUser.id}@discord.local`;

  return {
    userInfo: {
      id: discordUser.id,
      email,
      username: discordUser.username,
      avatar_url: discordUser.avatar 
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : null,
    },
    tokens: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
    },
  };
}
