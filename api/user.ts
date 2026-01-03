import { createClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-prod';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Verify JWT token
function verifyToken(token: string): { id: string; email: string } | null {
  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    return { id: decoded.id, email: decoded.email };
  } catch {
    return null;
  }
}

// Extract token from Authorization header
function getToken(req: any): string | null {
  const auth = req.headers.authorization || '';
  return auth.replace('Bearer ', '');
}

function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(Math.random().toString(36).substring(2, 12).toUpperCase());
  }
  return codes;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { method, query, body } = req;

  // USER PROFILE
  if (method === 'GET' && query.action === 'profile') {
    return getProfile(user, res);
  }

  if (method === 'PUT' && query.action === 'profile') {
    return updateProfile(user, body, res);
  }

  // 2FA
  if (method === 'POST' && query.action === 'enable-2fa') {
    return enableTwoFA(user, res);
  }

  if (method === 'POST' && query.action === 'verify-2fa') {
    return verifyTwoFA(user, body, res);
  }

  if (method === 'POST' && query.action === 'disable-2fa') {
    return disableTwoFA(user, res);
  }

  if (method === 'POST' && query.action === 'validate-2fa-token') {
    return validateTwoFAToken(user, body, res);
  }

  // EMAIL VERIFICATION
  if (method === 'POST' && query.action === 'send-verification-email') {
    return sendVerificationEmail(user, res);
  }

  if (method === 'POST' && query.action === 'verify-email') {
    return verifyEmail(user, body, res);
  }

  res.status(400).json({ error: 'Invalid request' });
}

// PROFILE HANDLERS

async function getProfile(user: any, res: any) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, username, avatar_url, email_verified, created_at')
      .eq('id', user.id)
      .limit(1);

    if (error || !data || data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check 2FA status
    const { data: twoFA } = await supabase
      .from('two_factor_auth')
      .select('enabled')
      .eq('user_id', user.id)
      .limit(1);

    const userData: any = data[0];
    userData.two_fa_enabled = twoFA?.[0]?.enabled || false;

    res.status(200).json({
      success: true,
      user: userData,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

async function updateProfile(user: any, body: any, res: any) {
  try {
    const { username, avatar_url } = body;

    const updates: any = {};
    if (username) updates.username = username;
    if (avatar_url) updates.avatar_url = avatar_url;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select();

    if (error || !data || data.length === 0) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    res.status(200).json({
      success: true,
      user: data[0],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// 2FA HANDLERS

async function enableTwoFA(user: any, res: any) {
  try {
    // Check if 2FA already exists
    const { data: existing } = await supabase
      .from('two_factor_auth')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);

    const secret = speakeasy.generateSecret({
      name: `TechPulse Daily (${user.email})`,
      issuer: 'TechPulse Daily',
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    if (existing && existing.length > 0) {
      // Update existing
      await supabase
        .from('two_factor_auth')
        .update({
          secret: secret.base32,
          qr_code: qrCode,
          enabled: false,
        })
        .eq('user_id', user.id);
    } else {
      // Create new
      await supabase.from('two_factor_auth').insert({
        user_id: user.id,
        secret: secret.base32,
        qr_code: qrCode,
        enabled: false,
      });
    }

    res.status(200).json({
      success: true,
      secret: secret.base32,
      qrCode,
    });
  } catch (error: any) {
    console.error('2FA enable error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function verifyTwoFA(user: any, body: any, res: any) {
  try {
    const { token } = body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const { data: twoFA, error } = await supabase
      .from('two_factor_auth')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);

    if (error || !twoFA || twoFA.length === 0) {
      return res.status(400).json({ error: '2FA not set up' });
    }

    const secret = twoFA[0].secret;

    // Verify TOTP token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // ±2 periods (±60 seconds)
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Update 2FA record
    await supabase
      .from('two_factor_auth')
      .update({
        enabled: true,
        backup_codes: backupCodes,
      })
      .eq('user_id', user.id);

    res.status(200).json({
      success: true,
      message: '2FA enabled successfully',
      backupCodes,
    });
  } catch (error: any) {
    console.error('2FA verify error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function disableTwoFA(user: any, res: any) {
  try {
    await supabase
      .from('two_factor_auth')
      .update({ enabled: false })
      .eq('user_id', user.id);

    res.status(200).json({
      success: true,
      message: '2FA disabled',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

async function validateTwoFAToken(user: any, body: any, res: any) {
  try {
    const { token } = body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const { data: twoFA, error } = await supabase
      .from('two_factor_auth')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);

    if (error || !twoFA || twoFA.length === 0 || !twoFA[0].enabled) {
      return res.status(400).json({ error: '2FA not enabled' });
    }

    const secret = twoFA[0].secret;

    // Verify TOTP token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    res.status(200).json({
      success: true,
      message: 'Token validated',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// EMAIL VERIFICATION HANDLERS

async function sendVerificationEmail(user: any, res: any) {
  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('email_verified')
      .eq('id', user.id)
      .limit(1);

    if (existingUser?.[0]?.email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await supabase.from('email_verifications').insert({
      user_id: user.id,
      email: user.email,
      token,
      expires_at: expiresAt,
    });

    // TODO: Send email with verification link
    // await sendEmail(user.email, 'Verify Your Email', `Click here to verify: ${verificationLink}`)

    res.status(200).json({
      success: true,
      message: 'Verification email sent',
      // For development only - remove in production
      testToken: token,
    });
  } catch (error: any) {
    console.error('Send verification email error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function verifyEmail(user: any, body: any, res: any) {
  try {
    const { token } = body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const { data: verification, error } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('token', token)
      .limit(1);

    if (error || !verification || verification.length === 0) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    const verificationRecord = verification[0];

    if (new Date(verificationRecord.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification token expired' });
    }

    // Update user
    await supabase
      .from('users')
      .update({ email_verified: true })
      .eq('id', user.id);

    // Delete verification record
    await supabase.from('email_verifications').delete().eq('id', verificationRecord.id);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error: any) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: error.message });
  }
}
