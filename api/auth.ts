import { createClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';

// Handle environment variables with fallbacks and variations
const supabaseUrl = process.env.SUPABASE_URL || 
                    process.env.VITE_SUPABASE_URL ||
                    process.env.supabase_url;

const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY ||
                          process.env.SUPABASE_KEY ||
                          process.env.SUPABASE_SERVICE_SECRET ||
                          process.env.supabase_service_key;

const jwtSecret = process.env.JWT_SECRET || 
                  process.env.JWT_SECRET_KEY ||
                  'default-jwt-secret-change-in-production';

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

  if (req.method === 'POST' && action === 'debug-user') {
    return debugUser(req, res);
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

async function debugUser(req: any, res: any) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    console.log('🔍 Debugging user:', email);

    // Check if user exists in Auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      return res.status(500).json({ error: 'Failed to list auth users', debug: authError.message });
    }

    const authUser = authUsers?.users?.find(u => u.email === email);
    
    // Check if user exists in public.users
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1)
      .single();

    res.status(200).json({
      success: true,
      debug: {
        email,
        authUser: authUser ? {
          id: authUser.id,
          email: authUser.email,
          email_confirmed_at: authUser.email_confirmed_at,
          last_sign_in_at: authUser.last_sign_in_at,
          user_metadata: authUser.user_metadata,
        } : 'NOT FOUND IN AUTH',
        publicUser: publicUser || 'NOT FOUND IN PUBLIC.USERS',
        publicError: publicError?.message || null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
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

    console.log('📋 Registering user with Supabase Auth:', email);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase not configured');
      return res.status(500).json({ 
        error: 'Database connection failed - server misconfiguration'
      });
    }
    
    // Use Supabase Auth to create user (handles password hashing automatically)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        username,
      },
      email_confirm: true, // Auto-confirm email to allow immediate login
    });

    if (authError) {
      console.error('❌ Auth error:', authError);
      // Check if user already exists
      if (authError.message.includes('already exists')) {
        return res.status(400).json({ error: 'User already exists' });
      }
      return res.status(500).json({ error: authError.message || 'Failed to create user' });
    }

    console.log('👤 User created in Auth:', authUser.user.id);

    // Create or update user profile in public.users table
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .upsert([
        {
          id: authUser.user.id,
          email: authUser.user.email,
          username,
          created_at: new Date().toISOString(),
        },
      ], { onConflict: 'id' })
      .select();

    if (profileError) {
      console.error('⚠️ Profile creation error:', profileError);
      // Don't fail if profile creation fails - auth user was created successfully
    } else {
      console.log('✅ User profile created:', authUser.user.id);
    }

    console.log('📦 Creating free subscription');
    // Create free subscription
    const { error: subError } = await supabase.from('subscriptions').insert([
      {
        user_id: authUser.user.id,
        plan: 'free',
        status: 'active',
      },
    ]);

    if (subError) {
      console.error('⚠️ Subscription creation error:', subError);
      // Don't fail registration if subscription fails
    }

    console.log('🔑 Generating JWT token');
    // Generate JWT token for immediate use
    const token = jwt.sign(
      { 
        id: authUser.user.id, 
        email: authUser.user.email,
        email_confirmed_at: authUser.user.email_confirmed_at,
      },
      jwtSecret,
      { expiresIn: '30d' }
    );

    console.log('✅ Registration successful');
    res.status(201).json({
      success: true,
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        username,
      },
      token,
      message: 'Registration successful. You can now login.',
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

    console.log('🔑 Authenticating with Supabase Auth');
    // Use Supabase Auth to verify credentials (handles password comparison securely)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.warn('❌ Auth error:', {
        message: authError.message,
        status: authError.status,
      });
      
      // Provide more specific error messages
      if (authError.message.includes('Invalid login credentials')) {
        return res.status(401).json({ 
          error: 'Invalid email or password',
          debug: 'User not found or password incorrect'
        });
      }
      
      return res.status(401).json({ 
        error: 'Invalid credentials',
        debug: authError.message
      });
    }

    if (!authData || !authData.user) {
      console.warn('❌ No user data returned from auth');
      return res.status(401).json({ error: 'Invalid credentials - no user data' });
    }

    const authUser = authData.user;
    console.log('✅ User authenticated:', authUser.id);
    console.log('👤 User email confirmed:', authUser.email_confirmed_at);

    console.log('📋 Fetching user profile');
    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .limit(1)
      .single();

    console.log('📦 Fetching subscription info');
    // Get subscription info
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', authUser.id)
      .limit(1);

    console.log('✅ Login successful');
    res.status(200).json({
      success: true,
      user: {
        id: authUser.id,
        email: authUser.email,
        username: userProfile?.username || '',
        avatar_url: userProfile?.avatar_url || null,
      },
      subscription: subscription?.[0] || null,
      token: authData.session.access_token,
    });
  } catch (error: any) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
