import { GoogleGenerativeAI } from '@google/generative-ai';

// 验证 API Key
if (!process.env.GOOGLE_AI_API_KEY) {
  console.error('❌ GOOGLE_AI_API_KEY environment variable is not set!');
  console.error('   Get one from: https://aistudio.google.com/app/apikey');
}

// 初始化 Gemini 客户端
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || 'not-configured');

// 支持的模型列表 (仅使用稳定且公开可用的模型)
const TEXT_MODELS = ['gemini-1.5-flash', 'gemini-2.0-flash'];
const IMAGE_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];

/**
 * 统一 AI 处理器 - 处理文本、图片、语音等生成任务
 */
export default async function handler(req: any, res: any) {
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
          return await handleNewsGeneration(dateStr, res);
        }
        return await handleTextGeneration(text || prompt, dateStr, res);
      
      case 'image':
        return await handleImageGeneration(headline, res);
      
      case 'news':
        return await handleNewsGeneration(dateStr, res);
      
      case 'speech':
        return await handleSpeechSynthesis(text, voice, res);
      
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action parameter',
          supported_actions: ['text', 'news', 'image', 'speech']
        });
    }
  } catch (error: any) {
    console.error('❌ AI Handler Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * 处理文本生成
 */
async function handleTextGeneration(prompt: string, dateStr: string | undefined, res: any) {
  if (!prompt && !dateStr) {
    // 如果没有提供 prompt，生成新闻
    return handleNewsGeneration(dateStr, res);
  }

  if (!process.env.GOOGLE_AI_API_KEY) {
    return res.status(500).json({
      success: false,
      error: 'GOOGLE_AI_API_KEY not configured'
    });
  }

  const content = await generateText(prompt || 'Generate a technology news summary');
  
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
async function handleNewsGeneration(dateStr: string | undefined, res: any) {
  if (!process.env.GOOGLE_AI_API_KEY) {
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

  const content = await generateText(prompt);
  
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
async function handleImageGeneration(headline: string, res: any) {
  if (!headline) {
    return res.status(400).json({
      success: false,
      error: 'headline parameter required'
    });
  }

  if (!process.env.GOOGLE_AI_API_KEY) {
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

  const imagePrompt = await generateText(prompt);
  
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
async function handleSpeechSynthesis(text: string, voice: string = 'female', res: any) {
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
 * 使用 Gemini 生成文本
 */
async function generateText(prompt: string): Promise<string> {
  if (!prompt) {
    throw new Error('Prompt is required');
  }

  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY not configured');
  }

  const errors: { model: string; error: string }[] = [];

  for (const model of TEXT_MODELS) {
    try {
      console.log(`🚀 Calling Gemini model: ${model}`);
      
      const modelInstance = genAI.getGenerativeModel({ model });
      
      const response = await modelInstance.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          maxOutputTokens: 2000
        }
      });

      const content = response.response.text();
      if (!content) {
        throw new Error('Empty response from Gemini API');
      }

      console.log(`✅ Text generation successful with model: ${model}`);
      return content;
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.error(`❌ Error with model ${model}:`, errorMsg);
      errors.push({ model, error: errorMsg });

      // 检查是否是速率限制错误
      if (
        errorMsg.includes('RESOURCE_EXHAUSTED') ||
        errorMsg.includes('429') ||
        errorMsg.includes('rate limit') ||
        errorMsg.includes('quota')
      ) {
        console.warn(`🔄 ${model} rate limit exceeded, trying next model...`);
        continue; // 尝试下一个模型
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
