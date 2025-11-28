import { createClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';

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

  if (method === 'GET' && query.action === 'profile') {
    return getProfile(user, res);
  }

  if (method === 'PUT' && query.action === 'profile') {
    return updateProfile(user, body, res);
  }

  if (method === 'GET' && query.action === 'subscription') {
    return getSubscription(user, res);
  }

  res.status(400).json({ error: 'Invalid request' });
}

async function getProfile(user: any, res: any) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, username, avatar_url, created_at')
      .eq('id', user.id)
      .limit(1);

    if (error || !data || data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: data[0],
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

async function getSubscription(user: any, res: any) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch subscription' });
    }

    const subscription = data?.[0] || null;

    res.status(200).json({
      success: true,
      subscription,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
