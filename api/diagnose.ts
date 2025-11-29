// Diagnostic endpoint to check environment variables
export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const envVars = {
      SUPABASE_URL: {
        exists: !!process.env.SUPABASE_URL,
        value: process.env.SUPABASE_URL ? '***set***' : 'NOT SET',
        hint: 'Should be https://xxx.supabase.co'
      },
      SUPABASE_SERVICE_KEY: {
        exists: !!process.env.SUPABASE_SERVICE_KEY,
        value: process.env.SUPABASE_SERVICE_KEY ? '***set***' : 'NOT SET',
        hint: 'Should be a long JWT token starting with eyJ'
      },
      GEMINI_API_KEY: {
        exists: !!process.env.GEMINI_API_KEY,
        value: process.env.GEMINI_API_KEY ? '***set***' : 'NOT SET',
        hint: 'Should be your Google AI API key'
      },
      JWT_SECRET: {
        exists: !!process.env.JWT_SECRET,
        value: process.env.JWT_SECRET ? '***set***' : 'NOT SET',
        hint: 'Your custom JWT secret'
      },
      API_KEY: {
        exists: !!process.env.API_KEY,
        value: process.env.API_KEY ? '***set***' : 'NOT SET',
        hint: 'Alternative API key (fallback)'
      }
    };

    const allSet = envVars.SUPABASE_URL.exists && 
                   envVars.SUPABASE_SERVICE_KEY.exists;

    res.status(200).json({
      success: true,
      message: allSet ? '✅ 所有必需的环境变量已设置' : '❌ 缺少环境变量',
      environmentVariables: envVars,
      allConfigured: allSet,
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform
    });
  } catch (error: any) {
    console.error('Diagnostic error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
}
