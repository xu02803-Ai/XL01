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
  
  // 预处理 AI 响应，修复常见的格式问题
  const preprocessed = preprocessAiResponse(content);
  console.log('📝 After preprocessing:', preprocessed.substring(0, 200));
  
  // 使用强化的 JSON 修复逻辑
  let newsData: any;
  try {
    newsData = parseAndFixJson(preprocessed);
    console.log('✅ JSON parse succeeded! Items:', Array.isArray(newsData) ? newsData.length : 'unknown');
  } catch (e: any) {
    console.error('❌ JSON parsing completely failed:', e.message);
    console.error('Full error details:', e);
    
    return res.status(200).json({
      success: false,
      error: 'Failed to parse news JSON: ' + e.message,
      hint: 'The API response contained malformed JSON that could not be repaired',
      rawContentPreview: preprocessed.substring(0, 500),
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
 * 处理图片生成 - 使用多源图片生成【改进】
 * 支持：1) 高质量AI生成图片 2) 真实照片搜索 3) 科技相关图片库
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
    
    // 第一阶段：生成超精细的AI图片提示词
    const imagePrompt = await generateEnhancedImagePrompt(headline, summary, category, apiKey);
    
    if (!imagePrompt) {
      console.warn("⚠️ Failed to generate image prompt, using fallback");
      return generateFallbackImage(headline, category, res);
    }
    
    console.log("✅ Generated detailed image prompt:", imagePrompt.substring(0, 150));
    
    // 第二阶段：使用多个服务生成图片（按优先级）
    const candidates = [
      // 1. 高质量AI生成（Pollinations）- 需要优质提示词
      async () => generatePollImage(imagePrompt),
      // 2. 通过搜索获取真实照片（SerpAPI + Pixabay）
      async () => generateRealImage(headline, category),
      // 3. 科技相关图片库 (Unsplash)
      async () => generateUnsplashImage(headline),
      // 4. Unicode艺术/占位图（最后的备用）
      async () => generatePlaceholderImage(headline, category)
    ];
    
    // 尝试每个候选项，找到第一个成功的
    let imageUrl: string | null = null;
    let usedSource: string = 'unknown';
    
    for (let i = 0; i < candidates.length; i++) {
      try {
        const result = (await Promise.race([
          candidates[i](),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 8000)
          )
        ])) as { success: boolean; url: string; source: string } | null;
        
        if (result && result.success) {
          imageUrl = result.url;
          usedSource = result.source;
          console.log(`✅ Image generated successfully from ${result.source}`);
          break;
        }
      } catch (e: any) {
        console.warn(`⚠️ Image source ${i + 1} failed:`, e.message);
        // 继续尝试下一个源
      }
    }
    
    // 如果所有来源都失败了，返回合理的备用方案
    if (!imageUrl) {
      console.warn("⚠️ All image sources failed, using gradient placeholder");
      imageUrl = generateGradientPlaceholder(category);
      usedSource = 'gradient-fallback';
    }
    
    return res.status(200).json({
      success: true,
      imageUrl,
      headline,
      imagePrompt,
      source: usedSource,
      model: 'gemini-2.0-flash (prompt) + multi-source (generation)',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Image generation error:", error);
    // 返回可靠的备用方案而不是失败
    return res.status(200).json({
      success: true,
      imageUrl: generateGradientPlaceholder(category),
      headline,
      source: 'error-gradient-fallback',
      error: 'Primary image generation failed, using fallback'
    });
  }
}

/**
 * 生成超精细AI图片提示词
 */
async function generateEnhancedImagePrompt(headline: string, summary: string, category: string, apiKey: string): Promise<string | null> {
  try {
    const categoryDescriptions: Record<string, string> = {
      'AI': '人工智能、深度学习、大模型、机器学习',
      'Tech': '科技、软件、硬件、互联网',
      'Semiconductors': '芯片、处理器、电子元件',
      'Energy': '能源、清洁能源、电池技术',
      'Science': '科学研究、物理、化学',
      'default': '现代科技、创新、未来'
    };
    
    const categoryHint = categoryDescriptions[category] || categoryDescriptions['default'];
    
    const detailedPrompt = `You are a world-class AI image prompt engineer for generating stunning, photorealistic tech news imagery. 

HEADLINE: "${headline}"
CATEGORY: ${categoryHint}
SUMMARY: "${summary}"

Create an ULTRA-DETAILED and CONCRETE image prompt that:

1. VISUAL REALISM: Make it look like professional photography or cinematic rendering
2. TECHNICAL ACCURACY: Ensure the image reflects the actual tech/topic
3. COMPELLING COMPOSITION: Include specific elements, angles, lighting
4. EMOTIONAL IMPACT: Inspire innovation and wonder
5. DETAIL LEVEL: Include colors, materials, lighting, depth, atmosphere

Requirements:
- 3-4 sentences, vivid and specific
- Include: (subject), (setting/background), (style/lighting), (mood/atmosphere)
- Use specific technical terms related to the news
- Mention specific materials, colors, and compositions
- Reference photographic/cinematic techniques
- NO abstract concepts - everything must be visually concrete

Example output quality:
"A cutting-edge AI data center with rows of glowing quantum processors emitting soft blue and purple bioluminescence, advanced cooling systems with flowing liquid nitrogen, sleek black and metallic surfaces, cinematic perspective with dramatic god rays penetrating from skylights, professional 8K photography with HDR lighting, shot on a RED camera"

NOW GENERATE ONLY THE IMAGE PROMPT - no explanations, no disclaimers, pure descriptive prompt:`;

    const prompt = await generateText(detailedPrompt, apiKey);
    return prompt.trim().substring(0, 500); // 将结果限制为500个字符
  } catch (e) {
    console.error("Failed to generate enhanced prompt:", e);
    return null;
  }
}

/**
 * 使用 Pollinations.ai 生成AI图片
 */
async function generatePollImage(prompt: string): Promise<{ success: boolean; url: string; source: string } | null> {
  try {
    // 对提示词进行优化编码
    const cleanPrompt = prompt
      .replace(/[^a-zA-Z0-9\s,.\-:()]/g, ' ')  // 移除特殊字符
      .substring(0, 300);  // 限制长度
    
    const encodedPrompt = encodeURIComponent(cleanPrompt);
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=576&enhance=true&nologo=true&seed=${seed}`;
    
    // 验证URL是否可访问
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const testFetch = await fetch(imageUrl, { 
        method: 'HEAD', 
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      clearTimeout(timeoutId);
      
      if (testFetch.status === 200 || testFetch.status === 405) { // 405是HEAD不支持，但说明URL有效
        console.log("✅ Pollinations image URL verified");
        return { success: true, url: imageUrl, source: 'Pollinations.ai' };
      }
    } catch (e: any) {
      console.warn("⚠️ Pollinations access check failed:", e.message);
      return null;
    }
    
  } catch (error) {
    console.error("❌ Pollinations generation failed:", error);
    return null;
  }
}

/**
 * 获取真实照片（使用搜索）
 */
async function generateRealImage(headline: string, category: string): Promise<{ success: boolean; url: string; source: string } | null> {
  try {
    // 提取关键词
    const keywords = headline.split(/\s+/).slice(0, 5).join(' ');
    
    // 多个备用的图片搜索服务
    const imageSources = [
      // 使用Pixabay API（需要key，但有限制）
      async () => {
        const pixabayKey = process.env.PIXABAY_API_KEY || 'placeholder';
        const searchTerm = encodeURIComponent(keywords);
        const url = `https://pixabay.com/api/?key=${pixabayKey}&q=${searchTerm}&image_type=photo&safesearch=true&per_page=3&order=popular`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(3000) });
        const data = await resp.json();
        if (data.hits && data.hits.length > 0) {
          return data.hits[Math.floor(Math.random() * data.hits.length)].largeImageURL;
        }
        return null;
      },
      // 使用Unsplash Collections
      async () => {
        const unsplashKeywords = ['technology', 'ai', 'innovation', 'future', 'digital'].includes(category.toLowerCase())
          ? category.toLowerCase()
          : 'technology';
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(unsplashKeywords)}&per_page=10&order_by=relevant`;
        const resp = await fetch(url, {
          headers: { 'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY || 'client_id'}` },
          signal: AbortSignal.timeout(3000)
        });
        const data = await resp.json();
        if (data.results && data.results.length > 0) {
          return data.results[Math.floor(Math.random() * data.results.length)].urls.regular;
        }
        return null;
      },
      // Pexels（免费，无限制）
      async () => {
        const searchTerm = encodeURIComponent('technology innovation');
        const url = `https://api.pexels.com/v1/search?query=${searchTerm}&per_page=15&orientation=landscape`;
        const resp = await fetch(url, {
          headers: { 'Authorization': process.env.PEXELS_API_KEY || 'placeholder' },
          signal: AbortSignal.timeout(3000)
        });
        const data = await resp.json();
        if (data.photos && data.photos.length > 0) {
          return data.photos[Math.floor(Math.random() * data.photos.length)].src.large;
        }
        return null;
      }
    ];
    
    for (const source of imageSources) {
      try {
        const imageUrl = await source();
        if (imageUrl && imageUrl.includes('http')) {
          return { success: true, url: imageUrl, source: 'Photo Library' };
        }
      } catch (e) {
        // 继续下一个源
      }
    }
    
    return null;
  } catch (error) {
    console.error("❌ Real image generation failed:", error);
    return null;
  }
}

/**
 * 使用 Unsplash 获取科技相关图片
 */
async function generateUnsplashImage(headline: string): Promise<{ success: boolean; url: string; source: string } | null> {
  try {
    const searchTerms = ['artificial intelligence', 'technology', 'digital innovation', 'future tech', 'software'];
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(term)}&per_page=20&order_by=relevant`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY || 'demo'}`,
        'User-Agent': 'Mozilla/5.0'
      },
      signal: AbortSignal.timeout(4000)
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const randomPhoto = data.results[Math.floor(Math.random() * data.results.length)];
        return {
          success: true,
          url: randomPhoto.urls.regular + '?w=1024&h=576&fit=crop',
          source: 'Unsplash'
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error("❌ Unsplash image generation failed:", error);
    return null;
  }
}

/**
 * 生成占位符图片（文本+样式）
 */
async function generatePlaceholderImage(headline: string, category: string): Promise<{ success: boolean; url: string; source: string } | null> {
  try {
    // 使用placeholder服务生成带文本的图片
    const title = headline.substring(0, 30).replace(/\s+/g, '+');
    const urls = [
      `https://via.placeholder.com/1024x576/4F46E5/FFFFFF?text=${title}`,
      `https://picsum.photos/1024/576?random=${Date.now()}`,
      `https://dummyimage.com/1024x576/4F46E5/FFFFFF.png?text=${title}`
    ];
    
    for (const url of urls) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
        if (response.ok) {
          return { success: true, url, source: 'Placeholder' };
        }
      } catch (e) {
        // 继续下一个
      }
    }
    
    return null;
  } catch (error) {
    console.error("❌ Placeholder image generation failed:", error);
    return null;
  }
}

/**
 * 生成渐变色的SVG占位图（最可靠的备用方案）
 */
function generateGradientPlaceholder(category: string): string {
  const gradients: Record<string, string> = {
    'AI': 'from-blue-700 to-blue-900',
    'Tech': 'from-indigo-600 to-purple-900', 
    'Semiconductors': 'from-amber-600 to-red-800',
    'Energy': 'from-green-600 to-emerald-900',
    'Science': 'from-cyan-600 to-blue-800',
    'default': 'from-slate-700 to-slate-900'
  };
  
  const gradient = gradients[category] || gradients['default'];
  
  // 生成SVG数据URL（可靠的备用图片）
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="576" viewBox="0 0 1024 576">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#${gradient.split('-')[1]};stop-opacity:1" />
        <stop offset="100%" style="stop-color:#${gradient.split('-')[2]};stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="1024" height="576" fill="url(#grad)"/>
    <text x="512" y="288" font-size="48" fill="white" text-anchor="middle" font-family="Arial, sans-serif" opacity="0.7">
      📰 科技新闻
    </text>
  </svg>`;
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/**
 * 回退图片生成函数
 */
async function generateFallbackImage(headline: string, category: string, res: any) {
  return res.status(200).json({
    success: true,
    imageUrl: generateGradientPlaceholder(category),
    headline,
    source: 'fallback-gradient',
    note: 'Using fallback image due to API constraints'
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
 * 预处理 AI 响应，移除字符串值中的问题字符
 */
function preprocessAiResponse(rawContent: string): string {
  // 1. 移除所有形式的代码块标记
  let processed = rawContent
    .replace(/```[\s\S]*?```/g, '')  // 移除所有代码块
    .replace(/^```[\s\S]*?\n/g, '')  // 移除开始代码块
    .replace(/\n```[\s\S]*?$/g, ''); // 移除结束代码块
  
  // 2. 尝试提取最外层的 JSON 数组（可能前后有文字）
  const arrayMatch = processed.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (arrayMatch) {
    processed = arrayMatch[0];
  }
  
  // 3. 修复常见的问题：
  // - 替换字符串内的真实换行符为空格或 \\n
  // - 但需要保留 JSON 结构的换行符
  
  // 使用状态机来只修复字符串内部的字符
  let result = '';
  let inString = false;
  let escaped = false;
  
  for (let i = 0; i < processed.length; i++) {
    const char = processed[i];
    const nextChar = i < processed.length - 1 ? processed[i + 1] : '';
    
    // 跟踪转义状态
    if (char === '\\' && !escaped) {
      escaped = true;
      result += char;
      continue;
    }
    
    // 跟踪字符串边界
    if (char === '"' && !escaped && nextChar !== ':') {
      inString = !inString;
    }
    
    // 修复字符串内的问题字符
    if (inString && !escaped) {
      if (char === '\n' || char === '\r') {
        result += ' '; // 用空格替换换行符
        escaped = false;
        continue;
      }
      if (char === '\t') {
        result += ' '; // 用空格替换制表符
        escaped = false;
        continue;
      }
    }
    
    escaped = false;
    result += char;
  }
  
  return result;
}
function fixUnterminatedStrings(jsonStr: string): string {
  // 检查是否存在未终止的字符串：找到所有 "key": "value" 但缺少结束引号的情况
  let fixed = jsonStr;
  let inString = false;
  let escaped = false;
  let result = '';
  let stringStartPos = -1;
  
  for (let i = 0; i < fixed.length; i++) {
    const char = fixed[i];
    const prevChar = i > 0 ? fixed[i - 1] : '';
    
    // 检查转义
    if (char === '\\' && !escaped) {
      escaped = true;
      result += char;
      continue;
    }
    
    // 处理引号
    if (char === '"' && !escaped) {
      if (!inString) {
        inString = true;
        stringStartPos = i;
      } else {
        inString = false;
        stringStartPos = -1;
      }
    }
    
    escaped = false;
    result += char;
  }
  
  // 如果最后还有未终止的字符串，添加结束引号
  if (inString && stringStartPos !== -1) {
    console.warn('⚠️ Found unterminated string starting at position', stringStartPos);
    result += '"';
  }
  
  return result;
}

/**
 * 修复缺失的冒号（在属性名后）
 */
function fixMissingColons(jsonStr: string): string {
  // 匹配 "key" 后直接跟 " 或 数字或 { 或 [ 的情况（缺少冒号）
  return jsonStr
    .replace(/"([^"]+)"\s+"/g, '"$1": "')  // "key" "value" -> "key": "value"
    .replace(/"([^"]+)"\s+([0-9\[{])/g, '"$1": $2');  // "key" numeric -> "key": numeric
}

/**
 * 修复缺失的逗号（在对象属性或数组元素之间）
 */
function fixMissingCommas(jsonStr: string): string {
  // 匹配两个对象之间缺少逗号的情况
  return jsonStr
    .replace(/}\s*{/g, '}, {')          // }{ -> }, {
    .replace(/]\s*{/g, '], {')          // ]{ -> ], {
    .replace(/}\s*\[/g, '}, [')         // }[ -> }, [
    .replace(/]\s*\[/g, '], [')         // ][ -> ], [
    .replace(/}\s*"/g, '}, "')          // }" -> }, "
    .replace(/]\s*"/g, '], "')          // ]" -> ], "
    .replace(/"\s*"/g, '", "');         // "" -> ", " (between string properties)
}

/**
 * 修复 JSON 结构问题
 */
function fixJsonStructure(jsonStr: string): string {
  let fixed = jsonStr;
  
  // 移除所有 JSON 外的文本
  const startIndex = fixed.indexOf('[');
  const endIndex = fixed.lastIndexOf(']');
  
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    fixed = fixed.substring(startIndex, endIndex + 1);
  }
  
  // 应用修复
  fixed = fixMissingColons(fixed);
  fixed = fixMissingCommas(fixed);
  
  // 修复常见的写法错误
  fixed = fixed
    .replace(/:\s*'([^']*)'/g, ': "$1"')  // 单引号改为双引号
    .replace(/[\u201c\u201d]/g, '"')      // 中文弯引号改为直引号
    .replace(/[\u2018\u2019]/g, "'")      // 中文单引号改为直单引号
    .replace(/,\s*([\]}])/g, '$1');       // 移除末尾逗号
  
  return fixed;
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
  
  // 第二点五步：修复 JSON 结构问题（缺失冒号、逗号等）
  fixed = fixJsonStructure(fixed);
  
  try {
    return JSON.parse(fixed);
  } catch (e2b: any) {
    console.warn('⚠️ Parse after structure fix failed');
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

  // 第六步：修复未终止的字符串
  fixed = fixUnterminatedStrings(fixed);
  
  try {
    return JSON.parse(fixed);
  } catch (e6: any) {
    console.warn('⚠️ Parse after fixing unterminated strings failed');
  }
  
  // 第七步：终极修复：将所有内容折叠成单行
  const lines = fixed.split('\n');
  fixed = lines
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('//'))
    .join('')
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']');
  
  try {
    return JSON.parse(fixed);
  } catch (e7: any) {
    console.error('❌ All JSON repair attempts failed');
    console.error('Position of error:', e7.message.match(/position (\d+)/)?.[1]);
    throw new Error('Unable to parse JSON after all repair attempts: ' + e7.message);
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
