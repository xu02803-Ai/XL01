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

  const prompt = `Role: Editor-in-Chief for "TechPulse Daily" (每日科技脉搏).
Task: Curate the most significant global technology news strictly for **${today}** (and late ${yesterday}).
Language: Simplified Chinese (简体中文).

CRITICAL DATE CONSTRAINT:
- You must ONLY include news that happened or was reported on **${yesterday}** or **${today}**.
- **ABSOLUTELY NO NEWS OLDER THAN 48 HOURS.**
- If a story is from last week, DISCARD IT immediately.

Priority Order:
1. **Artificial Intelligence (AI)**: LLMs, Agents, AGI breakthroughs
2. **Tech Giants**: Apple, Microsoft, Google, Meta, Tesla major moves
3. **Semiconductors & Chips**: Nvidia, TSMC, Quantum Computing
4. **Frontier Tech**: Brain-Computer Interfaces, Robotics, Bio-tech
5. **Energy & Aerospace**: New Energy, SpaceX, Space Exploration
6. **Fundamental Science**: Physics, Material Science, Mathematics

Instructions:
1. Select **6 to 8 distinct stories** covering the categories above.
2. Sort strictly by priority (AI news first).
3. Provide detailed summary (3-5 sentences) with key facts, context, and impact.

CRITICAL: Return ONLY valid JSON array (no markdown, no code blocks):
[
  {
    "headline": "Headline in Chinese",
    "summary": "Detailed summary in Chinese",
    "category": "Category name (e.g. 人工智能, 芯片技术)"
  }
]`;

  const content = await generateText(prompt, apiKey);
  
  // 清理 markdown 格式
  let jsonString = content.trim();
  if (jsonString.includes('```json')) {
    jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '');
  } else if (jsonString.includes('```')) {
    jsonString = jsonString.replace(/```/g, '');
  }
  
  // 尝试解析 JSON
  let newsData;
  try {
    newsData = JSON.parse(jsonString);
  } catch (e) {
    console.error('Failed to parse news JSON:', jsonString);
    // 返回错误但告诉前端发生了什么
    return res.status(200).json({
      success: false,
      error: 'Failed to parse news data',
      data: '[]'
    });
  }

  return res.status(200).json({
    success: true,
    // 返回作为 JSON 字符串，便于前端处理
    data: typeof newsData === 'string' ? newsData : JSON.stringify(newsData),
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

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'GOOGLE_AI_API_KEY not configured'
    });
  }

  // 使用 Gemini 生成图片提示词
  const prompt = `Given the news headline: "${headline}"
Generate a vivid, descriptive image prompt suitable for AI image generation (like DALL-E, Midjourney).
The prompt should be 1-2 sentences, creative, and visually evocative.
Return ONLY the image prompt, no additional text.`;

  const imagePrompt = await generateText(prompt, apiKey);
  
  return res.status(200).json({
    success: true,
    data: imagePrompt.trim(),
    headline,
    model: 'gemini-2.0-flash',
    timestamp: new Date().toISOString()
  });
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
 * ⚠️ 必须传入 apiKey 参数，不再支持从环境变量读取
 * 这样做是为了在 Vercel Serverless 环境中避免冷启动问题
 */
async function generateText(prompt: string, apiKey: string): Promise<string> {
  if (!prompt) {
    throw new Error('Prompt is required');
  }

  if (!apiKey || apiKey.trim().length === 0) {
    console.error('🔴 generateText: API Key is empty!');
    console.error('   API Key length:', apiKey?.length || 0);
    throw new Error('API Key is required and cannot be empty');
  }

  const key = apiKey.trim();
  const errors: { model: string; error: string }[] = [];

  for (const model of TEXT_MODELS) {
    try {
      console.log(`🚀 Calling Gemini v1beta REST API: ${model}`);
      
      // 使用 v1beta API（支持 -latest 后缀和 gemini-2.0 模型）
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      
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
          maxOutputTokens: 2000
        }
      };

      console.log(`📡 Sending request to: ${url.substring(0, 80)}...`);
      console.log(`🔑 API Key length: ${key.length}, starts with: ${key.substring(0, 5)}...`);

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
