import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const appName = 'TechPulse Daily';

const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '');

interface Enable2FABody {
  userId: string;
}

interface Verify2FABody {
  userId: string;
  token: string;
}

interface Validate2FABody {
  userId: string;
  code: string;
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

  if (req.method === 'POST' && action === 'enable') {
    return handleEnable2FA(req, res);
  }

  if (req.method === 'POST' && action === 'verify') {
    return handleVerify2FA(req, res);
  }

  if (req.method === 'POST' && action === 'validate') {
    return handleValidate2FA(req, res);
  }

  if (req.method === 'POST' && action === 'disable') {
    return handleDisable2FA(req, res);
  }

  if (req.method === 'GET' && action === 'recovery-codes') {
    return handleGetRecoveryCodes(req, res);
  }

  res.status(400).json({ error: 'Invalid request' });
}

async function handleEnable2FA(req: any, res: any) {
  try {
    console.log('🔐 Enable 2FA request');
    const { userId } = req.body as Enable2FABody;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // 检查用户是否已启用 2FA
    const { data: existing } = await supabase
      .from('two_factor_auth')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (existing && existing.length > 0 && existing[0].enabled) {
      console.warn('⚠️ 2FA already enabled for user');
      return res.status(400).json({ error: '2FA is already enabled' });
    }

    // 生成 TOTP 密钥
    const secret = speakeasy.generateSecret({
      name: `${appName} (${userId})`,
      length: 32,
    });

    console.log('🔑 Generated TOTP secret');

    // 生成恢复码
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    console.log('📝 Generated backup codes');

    // 保存 2FA 配置（禁用状态）
    if (!existing || existing.length === 0) {
      const { error } = await supabase
        .from('two_factor_auth')
        .insert([{
          user_id: userId,
          secret: secret.base32,
          backup_codes: backupCodes,
          enabled: false,
        }]);

      if (error) {
        console.error('❌ Failed to create 2FA record:', error);
        return res.status(500).json({ error: 'Failed to create 2FA record' });
      }
    } else {
      // 更新现有记录
      const { error } = await supabase
        .from('two_factor_auth')
        .update({
          secret: secret.base32,
          backup_codes: backupCodes,
          enabled: false,
        })
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Failed to update 2FA record:', error);
        return res.status(500).json({ error: 'Failed to update 2FA record' });
      }
    }

    // 生成二维码
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    console.log('✅ 2FA setup initiated');
    res.status(200).json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes,
      message: 'Scan the QR code with your authenticator app, then verify with a code',
    });
  } catch (error: any) {
    console.error('❌ Enable 2FA error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to enable 2FA' 
    });
  }
}

async function handleVerify2FA(req: any, res: any) {
  try {
    console.log('🔐 Verify 2FA request');
    const { userId, token } = req.body as Verify2FABody;

    if (!userId || !token) {
      return res.status(400).json({ error: 'Missing userId or token' });
    }

    // 获取 2FA 配置
    const { data: twoFAData, error: queryError } = await supabase
      .from('two_factor_auth')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (queryError || !twoFAData || twoFAData.length === 0) {
      console.warn('❌ 2FA not configured for user');
      return res.status(400).json({ error: '2FA not configured' });
    }

    const twoFA = twoFAData[0];

    // 验证令牌
    const isValid = speakeasy.totp.verify({
      secret: twoFA.secret,
      encoding: 'base32',
      token,
      window: 2, // 允许 30 秒的时间差
    });

    if (!isValid) {
      console.warn('❌ Invalid 2FA token');
      return res.status(400).json({ error: 'Invalid 2FA code' });
    }

    console.log('✅ 2FA token verified');

    // 启用 2FA
    const { error: updateError } = await supabase
      .from('two_factor_auth')
      .update({ enabled: true })
      .eq('user_id', userId);

    if (updateError) {
      console.error('❌ Failed to enable 2FA:', updateError);
      return res.status(500).json({ error: 'Failed to enable 2FA' });
    }

    // 更新用户的 2FA 标志
    const { error: userError } = await supabase
      .from('users')
      .update({ two_factor_enabled: true })
      .eq('id', userId);

    if (userError) {
      console.error('⚠️ Failed to update user 2FA flag:', userError);
    }

    // 记录审计日志
    await supabase.from('audit_logs').insert([{
      user_id: userId,
      action: '2fa_enabled',
      details: { provider: 'totp' },
    }]);

    console.log('✅ 2FA enabled successfully');
    res.status(200).json({
      success: true,
      message: '2FA enabled successfully',
      backupCodes: twoFA.backup_codes,
      backupCodesMessage: 'Save these recovery codes in a safe place. You can use them to regain access if you lose your authenticator.',
    });
  } catch (error: any) {
    console.error('❌ Verify 2FA error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to verify 2FA' 
    });
  }
}

async function handleValidate2FA(req: any, res: any) {
  try {
    console.log('🔐 Validate 2FA request');
    const { userId, code } = req.body as Validate2FABody;

    if (!userId || !code) {
      return res.status(400).json({ error: 'Missing userId or code' });
    }

    // 获取 2FA 配置
    const { data: twoFAData, error: queryError } = await supabase
      .from('two_factor_auth')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (queryError || !twoFAData || twoFAData.length === 0 || !twoFAData[0].enabled) {
      console.warn('❌ 2FA not enabled for user');
      return res.status(400).json({ error: '2FA not enabled' });
    }

    const twoFA = twoFAData[0];

    // 先尝试验证 TOTP 代码
    const isValidTOTP = speakeasy.totp.verify({
      secret: twoFA.secret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    let isValid = isValidTOTP;
    let usedBackupCode = false;

    // 如果 TOTP 无效，尝试恢复码
    if (!isValid && twoFA.backup_codes && twoFA.backup_codes.length > 0) {
      const codeIndex = twoFA.backup_codes.indexOf(code.toUpperCase());
      if (codeIndex !== -1) {
        isValid = true;
        usedBackupCode = true;

        // 移除已使用的恢复码
        const updatedCodes = twoFA.backup_codes.filter((_, i) => i !== codeIndex);
        await supabase
          .from('two_factor_auth')
          .update({ backup_codes: updatedCodes })
          .eq('user_id', userId);

        console.log('⚠️ Backup code used');
      }
    }

    if (!isValid) {
      console.warn('❌ Invalid 2FA code');
      return res.status(400).json({ error: 'Invalid 2FA code' });
    }

    console.log('✅ 2FA code validated');

    // 更新最后使用时间
    const { error: updateError } = await supabase
      .from('two_factor_auth')
      .update({
        last_used_code: code,
        last_used_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('⚠️ Failed to update 2FA last_used:', updateError);
    }

    // 记录审计日志
    await supabase.from('audit_logs').insert([{
      user_id: userId,
      action: '2fa_validated',
      details: { used_backup_code: usedBackupCode },
    }]);

    res.status(200).json({
      success: true,
      message: '2FA code valid',
      usedBackupCode,
      remainingBackupCodes: usedBackupCode ? (twoFA.backup_codes?.length || 0) - 1 : null,
    });
  } catch (error: any) {
    console.error('❌ Validate 2FA error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to validate 2FA' 
    });
  }
}

async function handleDisable2FA(req: any, res: any) {
  try {
    console.log('🔐 Disable 2FA request');
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // 禁用 2FA
    const { error } = await supabase
      .from('two_factor_auth')
      .update({ enabled: false, secret: null, backup_codes: [] })
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Failed to disable 2FA:', error);
      return res.status(500).json({ error: 'Failed to disable 2FA' });
    }

    // 更新用户的 2FA 标志
    const { error: userError } = await supabase
      .from('users')
      .update({ two_factor_enabled: false })
      .eq('id', userId);

    if (userError) {
      console.error('⚠️ Failed to update user 2FA flag:', userError);
    }

    // 记录审计日志
    await supabase.from('audit_logs').insert([{
      user_id: userId,
      action: '2fa_disabled',
    }]);

    console.log('✅ 2FA disabled successfully');
    res.status(200).json({
      success: true,
      message: '2FA disabled successfully',
    });
  } catch (error: any) {
    console.error('❌ Disable 2FA error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to disable 2FA' 
    });
  }
}

async function handleGetRecoveryCodes(req: any, res: any) {
  try {
    console.log('📝 Get recovery codes request');
    const userId = req.headers.authorization?.split('Bearer ')[1];

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 获取 2FA 配置
    const { data: twoFAData, error: queryError } = await supabase
      .from('two_factor_auth')
      .select('backup_codes')
      .eq('user_id', userId)
      .limit(1);

    if (queryError || !twoFAData || twoFAData.length === 0) {
      console.warn('❌ 2FA not configured for user');
      return res.status(400).json({ error: '2FA not configured' });
    }

    console.log('✅ Recovery codes retrieved');
    res.status(200).json({
      success: true,
      backupCodes: twoFAData[0].backup_codes || [],
    });
  } catch (error: any) {
    console.error('❌ Get recovery codes error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to get recovery codes' 
    });
  }
}
