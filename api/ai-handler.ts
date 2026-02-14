import { GoogleGenerativeAI } from '@google/generative-ai';

console.log('🚀 AI Handler module loading...');

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
 * Gemini 图像生成响应类型定义
 */
interface GeminiImageResponse {
  images?: Array<{
    data?: string;
    uri?: string;
  }>;
  error?: {
    message?: string;
    code?: number;
  };
}

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

  const { action, dateStr, headline, text, prompt, voice, summary, category } = 
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
        return await handleImageGeneration(headline, summary, category, apiKey, res);
      
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

  const prompt = `You are a professional technology news writer. Your task is to generate detailed technology news in JSON format.

Date context: ${today} (yesterday: ${yesterday})

CRITICAL REQUIREMENTS:
- ONLY news from last 48 hours
- 6-8 stories  
- Each story must be DETAILED and INFORMATIVE
- Sort by importance: AI > Tech Giants > Semiconductors > Frontier Tech > Energy > Science
- ALL VALUES MUST BE ON A SINGLE LINE - NO LINE BREAKS OR NEWLINES IN STRINGS
- Replace line breaks with spaces or period

IMPORTANT: Ensure all string values are properly escaped and on single lines.

Return ONLY valid JSON array (single line, no code blocks):
[
  {
    "headline": "HEADLINE IN CHINESE (compelling and descriptive)",
    "summary": "3-4 sentences comprehensive summary in Chinese. First sentence should be the main point. Include key details, context, and significance. Make it detailed enough to understand the full story.",
    "category": "CATEGORY_NAME",
    "content": "Detailed 3-4 paragraph explanation in single line. What happened. Why it matters. Technical details. Industry impact. Use periods to separate thoughts.",
    "source": "News outlet name",
    "impact": "Describe potential impact and significance in single line"
  }
]

CRITICAL: 
- No line breaks, no newlines in any string value. All on single lines.
- Make 'summary' field have at least 3-4 detailed sentences
- summary should be detailed and informative, not just a brief mention

START OUTPUTTING PURE JSON NOW:`;

  const content = await generateText(prompt, apiKey);
  
  console.log('📝 Raw response length:', content.length);
  console.log('📝 First 200 chars:', content.substring(0, 200));
  
  // 使用强化的 JSON 修复逻辑
  let newsData: any;
  try {
    newsData = parseAndFixJson(content);
    console.log('✅ JSON parse succeeded! Items:', Array.isArray(newsData) ? newsData.length : 'unknown');
  } catch (e: any) {
    console.error('❌ JSON parsing completely failed:', e.message);
    console.error('Full error details:', e);
    
    return res.status(200).json({
      success: false,
      error: 'Failed to parse news JSON: ' + e.message,
      hint: 'The API response contained malformed JSON that could not be repaired',
      rawContentPreview: content.substring(0, 500),
      data: []
    });
  }
  
  // 验证数据
  if (!Array.isArray(newsData)) {
    console.warn('⚠️ Parsed data is not an array, wrapping it');
    newsData = [newsData];
  }
  
  console.log('✅ Final validated news data has', newsData.length, 'items');
  
  return res.status(200).json({
    success: true,
    data: JSON.stringify(newsData),
    count: Array.isArray(newsData) ? newsData.length : 1,
    model: 'gemini-2.0-flash',
    timestamp: new Date().toISOString()
  });
}

/**
 * 处理图片生成 - 使用高级视觉提示词 + Pollinations.ai
 */
async function handleImageGeneration(headline: string, summary: string = '', category: string = '', apiKey: string, res: any) {
  if (!headline) {
    return res.status(400).json({
      success: false,
      error: 'headline parameter required'
    });
  }

  try {
    console.log("🖼️ Generating image for headline:", headline.substring(0, 50));
    
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'GOOGLE_AI_API_KEY not configured'
      });
    }
    
    // 使用 Gemini 生成高质量的视觉提示词
    const promptForImageGeneration = `You are an expert visual artist and prompt engineer. Based on this tech news:

Headline: "${headline}"
Category: "${category}"
Summary: "${summary}"

Generate a HIGHLY DETAILED and VIVID image prompt in English that:
1. Captures the essence of the tech innovation
2. Includes specific visual elements (colors, composition, style, lighting)
3. Is suitable for high-quality AI image generation
4. Should be cinematic, professional, and visually striking
5. 2-3 sentences max, but VERY descriptive

Focus on:
- What should be in the image (main subject, background, elements)
- Visual style (modern, futuristic, professional, detailed, cinematic)
- Colors and atmosphere
- Composition and perspective

Example quality level: "A sleek, futuristic AI server farm with holographic interfaces glowing softly, surrounded by flowing data streams in blue and purple hues, cinematic lighting, 8K professional photography style"

Return ONLY the vivid image prompt, no additional text or explanation.`;

    console.log("📝 Generating detailed image prompt from news...");
    const imagePrompt = await generateText(promptForImageGeneration, apiKey);
    const cleanedPrompt = imagePrompt.trim();
    
    console.log("✅ Generated detailed image prompt:", cleanedPrompt.substring(0, 150));
    
    // 使用 Pollinations.ai 生成高质量图片
    // 这是一个免费的、经过验证的图像生成服务
    const encodedPrompt = encodeURIComponent(cleanedPrompt);
    const pollsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=500&enhance=true&seed=${Date.now()}`;
    
    console.log("📸 Generating image with Pollinations.ai...");
    
    // 验证 URL 可访问性
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      try {
        const headCheck = await fetch(pollsUrl, { method: 'HEAD', signal: controller.signal });
        if (!headCheck.ok) {
          console.warn("⚠️ HEAD check failed, but will try full URL");
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (e) {
      console.warn("⚠️ Accessibility check failed, continuing with direct URL");
    }
    
    console.log("✅ Image URL generated successfully");
    
    return res.status(200).json({
      success: true,
      imageUrl: pollsUrl,
      headline,
      imagePrompt: cleanedPrompt,
      model: 'gemini-2.0-flash (prompt) + pollinations-ai (generation)',
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
  
  // 返回纯 Base64（前端会自动加上 data: 前缀）
  // 这是一个简短的示例 MP3 Base64 编码
  const placeholderBase64 = '//NExAAiYAIAFIABhADgEgAEBAP/3/w==';
  
  return res.status(200).json({
    success: true,
    data: placeholderBase64,  // 只返回纯 Base64，不包含 data:// 前缀
    mimeType: 'audio/mpeg',
    voice,
    note: 'TTS placeholder - integrate real TTS service for production',
    timestamp: new Date().toISOString()
  });
}

/**
 * 清理并修复 JSON 字符串中的特殊字符
 */
function sanitizeJsonString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')  // 先转义反斜杠
    .replace(/"/g, '\\"')    // 转义引号
    .replace(/\n/g, '\\n')   // 转义换行
    .replace(/\r/g, '\\r')   // 转义回车
    .replace(/\t/g, '\\t')   // 转义制表符
    .replace(/\v/g, '\\v')   // 转义垂直制表符
    .replace(/\f/g, '\\f');  // 转义换页符
}

/**
 * 修复 JSON 中损坏的字符串值
 */
function fixJsonStringValues(jsonStr: string): string {
  // 匹配 "key": "value" 的模式
  // 但要小心处理值中已经转义的引号
  return jsonStr.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"\s*:\s*"([^"]*)"/g, (match, key, value) => {
    // 对 key 和 value 进行清理
    const cleanedKey = key;
    const cleanedValue = sanitizeJsonString(value
      .replace(/\\"/g, '') // 移除已有的转义引号，然后重新转义
    );
    return `"${cleanedKey}": "${cleanedValue}"`;
  });
}

/**
 * 尝试修复并解析 JSON
 */
function parseAndFixJson(jsonString: string): any {
  // 第一步：直接尝试解析
  try {
    return JSON.parse(jsonString);
  } catch (e1: any) {
    console.warn('⚠️ Direct parse failed:', e1.message, 'at position', e1.message.match(/position (\d+)/)?.[1]);
  }
  
  // 第二步：移除 Markdown 代码块
  let fixed = jsonString
    .replace(/```json\s*\n?/g, '')
    .replace(/```\s*\n?/g, '')
    .replace(/\n?\s*```\s*$/g, '');
  
  try {
    return JSON.parse(fixed);
  } catch (e2: any) {
    console.warn('⚠️ Parse after removing markdown failed');
  }
  
  // 第三步：提取最外层的 JSON 数组
  const arrayStart = fixed.indexOf('[');
  const arrayEnd = fixed.lastIndexOf(']');
  
  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    fixed = fixed.substring(arrayStart, arrayEnd + 1);
  }
  
  try {
    return JSON.parse(fixed);
  } catch (e3: any) {
    console.warn('⚠️ Parse after extraction failed');
  }
  
  // 第四步：处理特殊字符
  fixed = fixed
    .replace(/[\u201c\u201d]/g, '"')  // 中文双引号
    .replace(/[\u2018\u2019]/g, "'") // 中文单引号
    .replace(/\u3001/g, ',')         // 中文顿号
    .replace(/\u3002/g, '.');        // 中文句号
  
  try {
    return JSON.parse(fixed);
  } catch (e4: any) {
    console.warn('⚠️ Parse after special char replacement failed');
  }
  
  // 第五步：尝试修复字符串值中的问题
  fixed = fixJsonStringValues(fixed);
  
  try {
    return JSON.parse(fixed);
  } catch (e5: any) {
    console.warn('⚠️ Parse after string value fix failed');
  }
  
  // 第六步：终极修复：将所有内容折叠成单行
  const lines = fixed.split('\n');
  fixed = lines
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('//'))
    .join('')
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']');
  
  try {
    return JSON.parse(fixed);
  } catch (e6: any) {
    console.error('❌ All JSON repair attempts failed');
    console.error('Position of error:', e6.message.match(/position (\d+)/)?.[1]);
    throw new Error('Unable to parse JSON after all repair attempts: ' + e6.message);
  }
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
