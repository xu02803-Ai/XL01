import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const appUrl = process.env.APP_URL || 'http://localhost:3000';

const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '');

interface SendVerificationEmailBody {
  email: string;
  userId: string;
}

interface VerifyEmailBody {
  token: string;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ 
      error: 'Server configuration error: Missing environment variables' 
    });
  }

  const action = req.query.action;

  if (req.method === 'POST' && action === 'send') {
    return handleSendVerification(req, res);
  }

  if (req.method === 'POST' && action === 'verify') {
    return handleVerifyEmail(req, res);
  }

  res.status(400).json({ error: 'Invalid request' });
}

async function handleSendVerification(req: any, res: any) {
  try {
    console.log('📧 Send email verification request');
    const { email, userId } = req.body as SendVerificationEmailBody;

    if (!email || !userId) {
      return res.status(400).json({ error: 'Missing email or userId' });
    }

    // 生成验证令牌
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 小时

    console.log('🔑 Creating verification token for:', email);

    // 保存验证令牌
    const { error } = await supabase
      .from('email_verifications')
      .insert([{
        user_id: userId,
        email,
        token,
        expires_at: expiresAt.toISOString(),
      }]);

    if (error) {
      console.error('❌ Failed to create verification token:', error);
      return res.status(500).json({ error: 'Failed to create verification token' });
    }

    // TODO: 集成邮件服务（Sendgrid, Resend, AWS SES 等）
    const verificationLink = `${appUrl}/verify-email?token=${token}`;
    
    console.log('📨 Would send verification email to:', email);
    console.log('🔗 Verification link:', verificationLink);

    // 暂时返回验证链接用于开发
    console.log('✅ Verification email would be sent');
    res.status(200).json({
      success: true,
      message: 'Verification email sent',
      // 仅在开发环境返回
      ...(process.env.NODE_ENV === 'development' && { 
        verificationLink 
      }),
    });
  } catch (error: any) {
    console.error('❌ Send verification error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to send verification email' 
    });
  }
}

async function handleVerifyEmail(req: any, res: any) {
  try {
    console.log('📧 Verify email request');
    const { token } = req.body as VerifyEmailBody;

    if (!token) {
      return res.status(400).json({ error: 'Missing verification token' });
    }

    console.log('🔍 Looking up verification token');

    // 查找验证令牌
    const { data: verification, error: queryError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('token', token)
      .limit(1);

    if (queryError || !verification || verification.length === 0) {
      console.warn('❌ Invalid or expired verification token');
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const verif = verification[0];

    // 检查过期时间
    if (new Date(verif.expires_at) < new Date()) {
      console.warn('❌ Verification token expired');
      return res.status(400).json({ error: 'Verification token has expired' });
    }

    // 检查是否已验证
    if (verif.verified_at) {
      console.warn('❌ Email already verified');
      return res.status(400).json({ error: 'Email already verified' });
    }

    console.log('✅ Marking email as verified:', verif.user_id);

    // 更新验证状态
    const { error: updateError } = await supabase
      .from('email_verifications')
      .update({
        verified_at: new Date().toISOString(),
      })
      .eq('id', verif.id);

    if (updateError) {
      console.error('❌ Failed to update verification status:', updateError);
      return res.status(500).json({ error: 'Failed to update verification status' });
    }

    // 更新用户的邮箱验证状态
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        email_verified: true,
        email_verified_at: new Date().toISOString(),
      })
      .eq('id', verif.user_id);

    if (userUpdateError) {
      console.error('⚠️ Failed to update user email_verified flag:', userUpdateError);
    }

    // 记录审计日志
    await supabase.from('audit_logs').insert([{
      user_id: verif.user_id,
      action: 'email_verified',
      details: { email: verif.email },
    }]);

    console.log('✅ Email verification successful');
    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error: any) {
    console.error('❌ Email verification error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to verify email' 
    });
  }
}
