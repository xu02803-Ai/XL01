import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const jwtSecret = process.env.JWT_SECRET || 'default-jwt-secret-change-in-production';

let supabase: any = null;

// Initialize Supabase only if credentials are available
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

interface RegisterBody {
  email: string;
  username: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Check environment variables
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables:', {
      SUPABASE_URL: !!supabaseUrl,
      SUPABASE_SERVICE_KEY: !!supabaseServiceKey,
      JWT_SECRET: !!jwtSecret,
    });
    return res.status(500).json({ 
      error: 'Server configuration error: Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables in Vercel.'
    });
  }

  const action = req.query.action;

  if (req.method === 'POST' && action === 'register') {
    return handleRegister(req, res);
  }

  if (req.method === 'POST' && action === 'login') {
    return handleLogin(req, res);
  }

  if (req.method === 'GET') {
    return res.status(200).json({ 
      success: true,
      message: 'Auth API is running',
      configured: !!(supabaseUrl && supabaseServiceKey)
    });
  }

  res.status(400).json({ error: 'Invalid request' });
}

async function handleRegister(req: any, res: any) {
  try {
    console.log('🔐 Register request received');
    const { email, username, password } = req.body as RegisterBody;

    // Validation
    if (!email || !username || !password) {
      console.warn('❌ Missing required fields:', { email: !!email, username: !!username, password: !!password });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (password.length < 8) {
      console.warn('❌ Password too short');
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    console.log('📋 Checking for existing user:', email);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase not configured');
      return res.status(500).json({ 
        error: 'Database connection failed - server misconfiguration'
      });
    }
    
    // Check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${email},username.eq.${username}`)
      .limit(1);

    if (checkError) {
      console.error('❌ Database error checking user:', checkError);
      return res.status(500).json({ error: 'Database error: ' + checkError.message });
    }

    if (existingUser && existingUser.length > 0) {
      console.warn('❌ User already exists:', email);
      return res.status(400).json({ error: 'User already exists' });
    }

    console.log('🔒 Hashing password');
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    console.log('👤 Creating user in database');
    // Create user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          username,
          password_hash: passwordHash,
        },
      ])
      .select();

    if (error || !newUser || newUser.length === 0) {
      console.error('❌ Registration error:', error);
      return res.status(500).json({ error: error?.message || 'Failed to create user' });
    }

    const user = newUser[0];
    console.log('✅ User created:', user.id);

    console.log('📦 Creating free subscription');
    // Create free subscription
    const { error: subError } = await supabase.from('subscriptions').insert([
      {
        user_id: user.id,
        plan: 'free',
        status: 'active',
      },
    ]);

    if (subError) {
      console.error('⚠️ Subscription creation error:', subError);
      // Don't fail registration if subscription fails
    }

    console.log('🔑 Generating JWT token');
    
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET not configured');
      return res.status(500).json({ 
        error: 'Token generation failed - JWT_SECRET not configured'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      jwtSecret,
      { expiresIn: '30d' }
    );

    console.log('✅ Registration successful');
    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
      token,
    });
  } catch (error: any) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleLogin(req: any, res: any) {
  try {
    console.log('🔐 Login request received');
    const { email, password } = req.body as LoginBody;

    if (!email || !password) {
      console.warn('❌ Missing email or password');
      return res.status(400).json({ error: 'Missing email or password' });
    }

    console.log('🔍 Looking up user:', email);
    // Get user
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (error || !users || users.length === 0) {
      console.warn('❌ User not found or database error:', error?.message);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    console.log('✅ User found:', user.id);

    console.log('🔑 Verifying password');
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      console.warn('❌ Password mismatch for user:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('✅ Password verified');

    console.log('🎫 Generating JWT token');
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      jwtSecret,
      { expiresIn: '30d' }
    );

    console.log('📦 Fetching subscription info');
    // Get subscription info
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);

    console.log('✅ Login successful');
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
    });
  } catch (error: any) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
