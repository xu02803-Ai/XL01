import { GoogleGenerativeAI } from '@google/generative-ai';

console.log('🚀 AI Handler module loading...');

// 支持的模型列表 (按优先顺序，v1beta 兼容 - 2026年最新模型)
const TEXT_MODELS = [
  'gemini-flash-latest',     // 最稳定的别名
  'gemini-2.0-flash-001',    // 2.0 系列精准版本
  'gemini-2.5-flash'         // 最先进的模型
];

/**
 * 统一 AI 处理器 - 处理文本、图片、语音等生成任务
 */
export default async function handler(req: any, res: any) {
  console.log(`📨 AI Handler called: ${req.method} ${req.url}`);
  
  // 🔍 诊断日志：检查环境变量是否被注入
  console.log('🔍 Diagnostic Check:');
  console.log('   GOOGLE_AI_API_KEY length:', (process.env.GOOGLE_AI_API_KEY || '').length);
  console.log('   GOOGLE_API_KEY length:', (process.env.GOOGLE_API_KEY || '').length);
  console.log('   All env vars with KEY:', Object.keys(process.env).filter(k => k.includes('KEY')));
  console.log('   All env vars with GOOGLE:', Object.keys(process.env).filter(k => k.includes('GOOGLE')));
  
  // 强制在 handler 函数内部读取，确保 Vercel Runtime 已经加载变量
  const apiKey = (process.env.GOOGLE_AI_API_KEY || '').trim();
  
  if (!apiKey || apiKey === 'not-configured') {
    console.error('🔴 CRITICAL: GOOGLE_AI_API_KEY environment variable is missing or empty!');
    console.error('   Environment variables available:', Object.keys(process.env).filter(k => k.includes('GOOGLE') || k.includes('API')));
    
    // 详细的诊断信息
    const diagnostics = {
      hasKey: !!apiKey,
      keyLength: apiKey?.length || 0,
      keyValue: apiKey || '[EMPTY]',
      keyStartsCorrectly: apiKey?.startsWith('AIza') || false,
      envVarsWithGoogle: Object.keys(process.env).filter(k => k.toUpperCase().includes('GOOGLE')),
      envVarsWithAPI: Object.keys(process.env).filter(k => k.toUpperCase().includes('API')),
      // 检查是否是在 Vercel 运行
      isVercel: !!process.env.VERCEL,
      vercelEnv: process.env.VERCEL_ENV || 'unknown',
      // 显示所有包含 KEY 的变量名
      allKeyVariables: Object.keys(process.env).filter(k => k.toUpperCase().includes('KEY'))
    };
    
    return res.status(500).json({
      success: false,
      error: 'Vercel Environment Variable GOOGLE_AI_API_KEY is missing or empty!',
      debug: diagnostics,
      checklist: {
        step1: '检查 Vercel 控制面板 > Settings > Environment Variables',
        step2: '确保变量名完全是：GOOGLE_AI_API_KEY（区分大小写）',
        step3: '确保勾选了 Production、Preview、Development 三个环境',
        step4: '点击 Redeploy 重新部署（不使用缓存）',
        step5: '等待 2-3 分钟后重试'
      },
      documentation: 'https://github.com/你的项目/VERCEL_ENV_CHECKLIST.md'
    });
  }
  
  // CORS 配置
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, dateStr, headline, text, prompt, voice } = 
    req.method === 'GET' ? req.query : (req.body || {});

  try {
    switch (action) {
      case 'text':
        // 如果有 dateStr，优先生成新闻；否则生成普通文本
        if (dateStr) {
          return await handleNewsGeneration(dateStr, apiKey, res);
        }
        return await handleTextGeneration(text || prompt, dateStr, apiKey, res);
      
      case 'image':
        return await handleImageGeneration(headline, apiKey, res);
      
      case 'news':
        return await handleNewsGeneration(dateStr, apiKey, res);
      
      case 'speech':
        return await handleSpeechSynthesis(text, voice, apiKey, res);
      
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action parameter',
          supported_actions: ['text', 'news', 'image', 'speech']
        });
    }
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    const errorName = error.name || 'Error';
    
    console.error('🔴 AI Handler Error:', {
      name: errorName,
      message: errorMessage,
      type: typeof error,
      fullError: String(error)
    });
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
      errorType: errorName,
      details: {
        path: '/api/ai-handler',
        action: action || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  }
}

/**
 * 处理文本生成
 */
async function handleTextGeneration(prompt: string, dateStr: string | undefined, apiKey: string, res: any) {
  if (!prompt && !dateStr) {
    // 如果没有提供 prompt，生成新闻
    return handleNewsGeneration(dateStr, apiKey, res);
  }

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'GOOGLE_AI_API_KEY not configured'
    });
  }

  const content = await generateText(prompt || 'Generate a technology news summary', apiKey);
  
  return res.status(200).json({
    success: true,
    data: content,
    model: 'gemini-2.0-flash',
    timestamp: new Date().toISOString()
  });
}

/**
 * 处理新闻生成
 */
async function handleNewsGeneration(dateStr: string | undefined, apiKey: string, res: any) {
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'GOOGLE_AI_API_KEY not configured'
    });
  }

  const now = new Date();
  const today = dateStr || now.toISOString().split('T')[0];
  
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().split('T')[0];

  const prompt = `You are a technology news curator. Your ONLY job is to return a JSON array. Do NOT add any explanation, markdown, or other text.

Generated news for: ${today} (yesterday: ${yesterday})

RULES:
- ONLY news from last 48 hours
- 6-8 stories
- Sort by AI > Tech Giants > Semiconductors > Frontier Tech > Energy > Science

Return ONLY this format (no code blocks, no markdown, no explanation):
[
  {
    "headline": "NEWS HEADLINE IN CHINESE",
    "summary": "2-3 sentences summary in Chinese",
    "category": "CATEGORY_NAME"
  }
]

START OUTPUTTING PURE JSON NOW:`;

  const content = await generateText(prompt, apiKey);
  
  // 🧹 高级清洁逻辑
  let jsonString = content.trim();
  
  console.log('📝 Raw response length:', jsonString.length);
  console.log('📝 First 400 chars:', jsonString.substring(0, 400));
  
  // 首先尝试直接解析，看看是否需要清理
  let newsData: any;
  try {
    newsData = JSON.parse(jsonString);
    console.log('✅ Direct parse succeeded! Items:', Array.isArray(newsData) ? newsData.length : 'unknown');
  } catch (e1) {
    console.warn('⚠️ Direct parse failed, attempting cleanup...');
    
    // 第一步：移除 Markdown 代码块
    jsonString = jsonString.replace(/```json\s*\n?/g, '');
    jsonString = jsonString.replace(/```\s*\n?/g, '');
    jsonString = jsonString.replace(/\n?\s*```\s*$/g, '');
    
    // 第二步：提取最外层的 JSON 数组
    const arrayStart = jsonString.indexOf('[');
    const arrayEnd = jsonString.lastIndexOf(']');
    
    if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
      jsonString = jsonString.substring(arrayStart, arrayEnd + 1);
    }
    
    // 第三步：处理中文引号和特殊字符
    jsonString = jsonString.replace(/[\u201c\u201d]/g, '"');
    jsonString = jsonString.replace(/[\u2018\u2019]/g, "'");
    
    console.log('🧹 After cleanup, length:', jsonString.length);
    console.log('🧹 First 400 chars:', jsonString.substring(0, 400));
    
    // 尝试再次解析
    try {
      newsData = JSON.parse(jsonString);
      console.log('✅ Parse after cleanup succeeded! Items:', Array.isArray(newsData) ? newsData.length : 'unknown');
    } catch (e2) {
      console.error('❌ Parse after cleanup failed:', (e2 as any).message);
      console.error('   String to parse:', jsonString);
      
      // 最后的尝试：逐行查找问题
      const lines = jsonString.split('\n');
      console.error('   Total lines:', lines.length);
      for (let i = 0; i < Math.min(10, lines.length); i++) {
        console.error(`   Line ${i}: ${lines[i].substring(0, 100)}`);
      }
      
      return res.status(200).json({
        success: false,
        error: 'Failed to parse news JSON: ' + (e2 as any).message,
        hint: 'Check Vercel logs for raw content',
        data: []
      });
    }
  }
  
  return res.status(200).json({
    success: true,
    // 返回 JSON 字符串（前端期望的格式）
    data: JSON.stringify(newsData),
    count: Array.isArray(newsData) ? newsData.length : 1,
    model: 'gemini-2.0-flash',
    timestamp: new Date().toISOString()
  });
}

/**
 * 处理图片生成
 */
async function handleImageGeneration(headline: string, apiKey: string, res: any) {
  if (!headline) {
    return res.status(400).json({
      success: false,
      error: 'headline parameter required'
    });
  }

  try {
    console.log("🖼️ Generating image for headline:", headline.substring(0, 50));
    
    // 方案1：使用免费的 Pollinations.ai API 直接生成图片
    // 这是最快最简单的方式，无需额外的 API Key
    const encodedHeadline = encodeURIComponent(headline);
    const pollsUrl = `https://image.pollinations.ai/prompt/${encodedHeadline}?width=600&height=400&seed=${Date.now()}`;
    
    console.log("📸 Using Pollinations.ai URL:", pollsUrl);
    
    // 验证 URL 可访问性（可选的轻量检查）
    try {
      const headCheck = await fetch(pollsUrl, { method: 'HEAD', timeout: 5000 });
      if (headCheck.ok) {
        console.log("✅ Image URL verified, using:", pollsUrl);
      }
    } catch (e) {
      console.warn("⚠️ HEAD request failed, will try direct URL:", (e as any).message);
    }
    
    return res.status(200).json({
      success: true,
      imageUrl: pollsUrl,  // 前端期望的字段
      headline,
      model: 'pollinations-ai',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Image generation error:", error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate image',
      details: (error as any).message
    });
  }
}

/**
 * 处理语音合成
 */
async function handleSpeechSynthesis(text: string, voice: string = 'female', apiKey: string, res: any) {
  if (!text) {
    return res.status(400).json({
      success: false,
      error: 'text parameter required'
    });
  }

  // 注意：Gemini API 不支持 TTS
  // 这里返回占位符，实际项目应使用 Google Cloud TTS 或其他服务
  console.warn('⚠️ Gemini API does not support TTS natively. Using placeholder response.');
  
  return res.status(200).json({
    success: true,
    data: 'data:audio/mpeg;base64,//NExAAiYAIAFIABhADgEgAEBAP/3/w==',
    mimeType: 'audio/mpeg',
    voice,
    note: 'TTS placeholder - integrate real TTS service for production',
    timestamp: new Date().toISOString()
  });
}

/**
 * Gemini API 响应类型定义
 */
interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
    code?: number;
  };
}

/**
 * 使用 Gemini v1beta REST API 生成文本（支持 -latest 后缀和 gemini-2.0 模型）
 * v1beta 是支持最新模型和前沿功能的推荐通道
 * 
 * 🔧 强力手术版本：在函数内部强制实时读取和校验 API Key
 * 确保 Vercel 运行时的环境变量被正确注入
 */
async function generateText(prompt: string, apiKey: string): Promise<string> {
  if (!prompt) {
    throw new Error('Prompt is required');
  }

  // 🔥 强力读取：在函数内部直接重新读取环境变量，不依赖传入参数
  let finalKey = apiKey;
  
  // 如果传入的 Key 为空，尝试从环境变量读取
  if (!finalKey || finalKey.trim().length === 0) {
    console.warn('⚠️ Passed apiKey is empty, attempting to read from process.env');
    
    // 尝试从多个可能的环境变量名读取
    finalKey = (process.env.GOOGLE_AI_API_KEY || 
                process.env.GOOGLE_API_KEY || 
                '').trim();
    
    console.log('📍 Re-fetched from env:', {
      googleAiApiKeyLength: (process.env.GOOGLE_AI_API_KEY || '').length,
      googleApiKeyLength: (process.env.GOOGLE_API_KEY || '').length,
      finalKeyLength: finalKey.length
    });
  }

  if (!finalKey || finalKey.length === 0) {
    console.error('🔴 FATAL: API Key is completely empty after all attempts!');
    console.error('   Passed apiKey length:', apiKey?.length || 0);
    console.error('   process.env.GOOGLE_AI_API_KEY length:', (process.env.GOOGLE_AI_API_KEY || '').length);
    console.error('   process.env.GOOGLE_API_KEY length:', (process.env.GOOGLE_API_KEY || '').length);
    console.error('   All available env vars:', Object.keys(process.env).filter(k => k.toUpperCase().includes('KEY') || k.toUpperCase().includes('API')));
    throw new Error('API Key is required but completely empty - environment variable not injected by Vercel');
  }

  const key = finalKey.trim();
  
  console.log('✅ API Key validated:', {
    keyLength: key.length,
    keyStart: key.substring(0, 5),
    keyEnd: key.substring(key.length - 5),
    isValidFormat: key.startsWith('AIza') || key.length > 30
  });

  const errors: { model: string; error: string }[] = [];

  for (const model of TEXT_MODELS) {
    try {
      console.log(`🚀 Calling Gemini v1beta REST API: ${model}`);
      
      // 使用 v1beta API（支持 -latest 后缀和 gemini-2.0 模型）
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      
      // 🔍 关键检查：确保 URL 中 key= 后面有值
      if (!url.includes(`key=${key}`) || url.includes('key=undefined') || url.includes('key=null')) {
        throw new Error(`CRITICAL: URL is malformed - key parameter is empty or null in URL: ${url.substring(0, 100)}`);
      }
      
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          maxOutputTokens: 4000
        }
      };

      console.log(`📡 Sending request to: ${url.substring(0, 80)}...`);
      console.log(`🔑 URL Key Parameter: ${url.substring(url.indexOf('key='), Math.min(url.indexOf('key=') + 30, url.length))}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const responseData = (await response.json()) as GeminiResponse;

      if (!response.ok) {
        const errorMsg = responseData?.error?.message || `HTTP ${response.status}`;
        const errorCode = responseData?.error?.code || response.status;
        
        // 如果是 400 API Key 错误，输出诊断信息
        if (response.status === 400 && errorMsg.includes('API key')) {
          console.error('🔴 400 API Key Error:', {
            errorCode,
            errorMsg,
            urlUsed: url.substring(0, 100),
            keyLength: key.length,
            keyUsed: key.substring(0, 10) + '...'
          });
        }
        
        throw new Error(`[${errorCode}] ${errorMsg}`);
      }

      if (!responseData.candidates || !responseData.candidates[0]) {
        throw new Error('Empty response from Gemini API');
      }

      const content = responseData.candidates[0]?.content?.parts?.[0]?.text;
      if (!content) {
        throw new Error('No text in response from Gemini API');
      }

      console.log(`✅ Text generation successful with model: ${model}`);
      return content;
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      
      console.error(`❌ Error with model ${model}:`, {
        message: errorMsg,
        details: String(error).substring(0, 300)
      });
      
      errors.push({ model, error: errorMsg });

      // 检查是否是速率限制错误
      if (
        errorMsg.includes('RESOURCE_EXHAUSTED') ||
        errorMsg.includes('429') ||
        errorMsg.includes('rate limit') ||
        errorMsg.includes('quota')
      ) {
        console.warn(`🔄 ${model} rate limit exceeded, trying next model...`);
        continue;
      }

      // 其他错误，如果不是最后一个模型也继续尝试
      if (model !== TEXT_MODELS[TEXT_MODELS.length - 1]) {
        console.log(`⏭️  Trying next model...`);
        continue;
      }
    }
  }

  // 所有模型都失败，返回详细错误
  const errorDetails = errors.map(e => `${e.model}: ${e.error}`).join(' | ');
  const detailedError = `All Gemini models failed: ${errorDetails}`;
  console.error(`🔴 ${detailedError}`);
  throw new Error(detailedError);
}
