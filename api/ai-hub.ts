/**
 * 🎯 AI Hub - 万能AI调度器
 * 
 * 将多个独立的 API 文件合并为一个统一入口，解决 Vercel 12 个函数限制
 * 通过 URL 参数 type 来决定执行的逻辑：
 * - ?type=content    → 生成新闻内容
 * - ?type=image      → 生成图片
 * - ?type=speech     → 合成语音
 * - ?type=stats      → 查看模型统计
 */

import { GoogleGenAI, Modality } from "@google/genai";
import { callGeminiWithFallback, getModelStats, disableModel, enableModel, resetModelStats } from "./gemini-utils";

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!key) {
    throw new Error("API key not configured");
  }
  return key;
};

const getDateContext = () => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().split('T')[0];

  return { today, yesterday };
};

// ============================================================================
// 🔧 工具函数
// ============================================================================

const generateImagePrompt = async (headline: string, apiKey: string): Promise<string> => {
  try {
    const prompt = `Create a detailed, tech-focused image generation prompt for this tech news. The image should be visually striking, modern, and directly related to the content. Use vibrant colors, NOT dark colors.\n\nNews headline: "${headline}"\n\nReturn a single, detailed prompt (max 150 words) optimized for AI image generation. Focus on: bright and vibrant visual style, tech elements, composition, professional lighting, and mood. Make it specific to the news topic. IMPORTANT: Use bright colors and good lighting, avoid dark images.`;
    
    const result = await callGeminiWithFallback(apiKey, prompt, {
      model: "gemini-2.5-flash",
      maxTokens: 256,
    });

    if (result.success && result.content) {
      return result.content.trim();
    }
    return `Modern bright technology news illustration about ${headline}, professional, tech aesthetic, digital art, vibrant colors, well-lit, futuristic, high quality`;
  } catch (e) {
    console.warn("Failed to generate image prompt, using default");
    return `Modern bright technology news illustration about ${headline}, professional, tech aesthetic, digital art, vibrant colors, well-lit, futuristic, high quality`;
  }
};

const extractKeyTerms = async (headline: string, apiKey: string): Promise<string> => {
  try {
    const prompt = `Extract 2-3 key terms from this tech news headline for image search. Return ONLY the terms separated by commas, no explanation.\n\nHeadline: "${headline}"`;
    
    const result = await callGeminiWithFallback(apiKey, prompt, {
      model: "gemini-2.5-flash",
      maxTokens: 50,
    });

    if (result.success && result.content) {
      return result.content.trim().split(',')[0].trim();
    }
    return headline.split(' ').slice(0, 2).join(' ');
  } catch (e) {
    console.warn("Failed to extract terms, using headline");
    return headline.split(' ').slice(0, 2).join(' ');
  }
};

// ============================================================================
// 📝 逻辑 A: 生成新闻内容 (?type=content)
// ============================================================================

async function handleContent(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = getApiKey();
    const { today, yesterday } = getDateContext();

    const prompt = `
Role: Editor-in-Chief for "TechPulse Daily" (每日科技脉搏).
Task: Curate the most significant global technology news strictly for **${today}** (and late ${yesterday}).
Language: Simplified Chinese (简体中文).

CRITICAL DATE CONSTRAINT:
- You must ONLY include news that happened or was reported on **${yesterday}** or **${today}**.
- **ABSOLUTELY NO NEWS OLDER THAN 48 HOURS.**
- If a story is from last week, DISCARD IT immediately.
- Check the publication date carefully.

Priority Order:
1. **Artificial Intelligence (AI)**: LLMs, Agents, AGI breakthroughs, OpenAI, Gemini, Claude
2. **Tech Giants**: Apple, Microsoft, Google, Meta, Tesla major moves
3. **Semiconductors & Chips**: Nvidia, TSMC, Quantum Computing
4. **Frontier Tech**: Brain-Computer Interfaces, Robotics, Bio-tech
5. **Energy & Aerospace**: New Energy, SpaceX, Space Exploration
6. **Fundamental Science**: Physics, Material Science, Mathematics

Instructions:
1. Use Google Search to find **Breaking News** and **Real-time Updates**.
2. Select **6 to 8 distinct stories** covering the categories above.
3. Sort strictly by priority (AI news first).
4. Provide detailed summary (3-5 sentences) with key facts, context, and impact.

CRITICAL: Return ONLY valid JSON array (no markdown, no code blocks):
[
  {
    "headline": "Headline in Chinese",
    "summary": "Detailed summary in Chinese",
    "category": "Category name (e.g. 人工智能, 芯片技术)"
  }
]
`;

    console.log("📰 Calling Gemini API with fallback support");
    
    const result = await callGeminiWithFallback(apiKey, prompt, {
      model: "gemini-2.5-flash",
      maxTokens: 4096,
    });

    if (!result.success) {
      console.error("❌ Content generation failed:", result.error);
      return res.status(500).json({ 
        success: false,
        error: result.error,
        modelStats: getModelStats()
      });
    }

    console.log("✅ API Response received from model:", result.model);
    
    let jsonString = result.content!.trim();
    jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    try {
      const parsed = JSON.parse(jsonString);
      console.log("✅ Valid JSON parsed, items count:", Array.isArray(parsed) ? parsed.length : 1);
    } catch (e) {
      console.error("❌ Invalid JSON in response");
      return res.status(500).json({ 
        success: false,
        error: "Invalid JSON response from API" 
      });
    }
    
    return res.status(200).json({ success: true, data: jsonString });
  } catch (error: any) {
    console.error("❌ Content generation error:", error.message);
    return res.status(500).json({ 
      success: false,
      error: error.message || "Internal server error" 
    });
  }
}

// ============================================================================
// 🖼️ 逻辑 B: 生成图片 (?type=image)
// ============================================================================

async function handleImage(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { headline } = req.query;
    if (!headline) {
      return res.status(400).json({ error: "Missing headline parameter" });
    }

    const apiKey = getApiKey();
    const decodedHeadline = decodeURIComponent(headline);
    const randomSeed = Math.random().toString(36).substring(2, 10);
    const timestamp = Date.now();

    console.log(`🖼️ Generating image for headline: ${decodedHeadline.substring(0, 50)}...`);

    // Generate enhanced prompt
    const enhancedPrompt = await generateImagePrompt(decodedHeadline, apiKey);
    console.log(`📝 Enhanced prompt generated`);

    // Try fetching image via direct CDN URLs
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&nologo=true&ts=${timestamp}`;

    console.log(`✅ Image generated successfully`);
    return res.status(200).json({
      success: true,
      url: imageUrl,
      type: "url",
      seed: randomSeed,
      timestamp
    });
  } catch (error: any) {
    console.error("❌ Image generation error:", error.message);
    res.status(500).json({ 
      success: false,
      error: error.message || "Internal server error" 
    });
  }
}

// ============================================================================
// 🎙️ 逻辑 C: 语音合成 (?type=speech)
// ============================================================================

async function callTTSWithFallback(
  apiKey: string,
  text: string,
  voiceName: string
): Promise<{ success: boolean; data?: string; mimeType?: string; model?: string; error?: string }> {
  const models = [
    'gemini-2.5-flash-preview-tts',
    'gemini-1.5-pro',
  ];

  let lastError = "";

  for (const modelId of models) {
    try {
      console.log(`🎙️ Attempting TTS with model: ${modelId}, voice: ${voiceName}`);
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: modelId,
        contents: [{
          role: "user",
          parts: [{ text }]
        }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName
              }
            }
          }
        }
      } as any);

      const part = response.candidates?.[0]?.content?.parts?.[0];
      
      if (part && "inlineData" in part && part.inlineData) {
        console.log(`✅ TTS success with model ${modelId}`);
        return {
          success: true,
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'audio/mpeg',
          model: modelId
        };
      }

      lastError = "No audio data in response";
      console.warn(`⚠️ Model ${modelId} returned no audio data, trying next...`);
      
    } catch (error: any) {
      lastError = error.message || String(error);
      console.warn(`⚠️ TTS model ${modelId} failed:`, lastError);
      continue;
    }
  }

  return {
    success: false,
    error: `All TTS models failed. Last error: ${lastError}`,
  };
}

async function handleSpeech(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, voice } = req.query;
    
    if (!text || !voice) {
      return res.status(400).json({ error: "Missing text or voice parameter" });
    }

    const apiKey = getApiKey();
    const decodedText = decodeURIComponent(text);
    
    const voiceMap: { [key: string]: string } = {
      'male': 'Puck',
      'Male': 'Puck',
      'MALE': 'Puck',
      'female': 'Kore',
      'Female': 'Kore',
      'FEMALE': 'Kore'
    };
    
    const voiceName = voiceMap[voice] || 'Kore';
    
    console.log("🎙️ Calling TTS API with fallback support, voice:", voiceName, "Text length:", decodedText.length);
    
    const result = await callTTSWithFallback(apiKey, decodedText, voiceName);

    if (result.success) {
      return res.status(200).json({ 
        success: true, 
        data: result.data,
        mimeType: result.mimeType,
        model: result.model
      });
    }
    
    console.warn("❌ No audio data in response");
    return res.status(200).json({ 
      success: false, 
      error: result.error,
      modelStats: getModelStats()
    });
    
  } catch (error: any) {
    console.error("❌ Audio generation error:", error.message);
    res.status(500).json({ 
      success: false,
      error: error.message || "Internal server error" 
    });
  }
}

// ============================================================================
// 📊 逻辑 D: 模型统计 (?type=stats)
// ============================================================================

async function handleStats(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const stats = getModelStats();
      
      console.log('📊 Model Statistics:');
      stats.forEach(s => {
        console.log(`  ${s.model}: ${s.successRate} (${s.successCount} successes, ${s.errorCount} errors)`);
      });

      return res.status(200).json({
        success: true,
        timestamp: new Date().toISOString(),
        models: stats,
        summary: {
          totalRequests: stats.reduce((sum, s) => sum + s.successCount + s.errorCount, 0),
          totalSuccesses: stats.reduce((sum, s) => sum + s.successCount, 0),
          totalErrors: stats.reduce((sum, s) => sum + s.errorCount, 0),
          overallSuccessRate: 
            stats.reduce((sum, s) => sum + s.successCount + s.errorCount, 0) > 0
              ? (
                  (stats.reduce((sum, s) => sum + s.successCount, 0) / 
                   stats.reduce((sum, s) => sum + s.successCount + s.errorCount, 0)) * 100
                ).toFixed(2) + '%'
              : 'N/A',
          recommendedAction: 
            stats.filter(s => s.successCount > 0).length === 0 
              ? '⚠️ All models experiencing issues - check API keys and quotas'
              : stats[0]?.successRate === '100.00%'
              ? '✅ Primary model functioning normally'
              : '🔄 Using fallback models - primary model has issues'
        }
      });
    }

    if (req.method === 'POST') {
      const { action, model } = req.body;

      if (action === 'reset') {
        resetModelStats();
        console.log('🔄 Model statistics reset');
        return res.status(200).json({
          success: true,
          message: 'Model statistics have been reset'
        });
      }

      if (action === 'disable' && model) {
        disableModel(model);
        return res.status(200).json({
          success: true,
          message: `Model ${model} has been disabled`,
          models: getModelStats()
        });
      }

      if (action === 'enable' && model) {
        enableModel(model);
        return res.status(200).json({
          success: true,
          message: `Model ${model} has been enabled`,
          models: getModelStats()
        });
      }

      return res.status(400).json({
        error: 'Invalid action. Use: reset, disable (with model parameter), or enable (with model parameter)'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('❌ Model stats endpoint error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

// ============================================================================
// 🎯 主入口：根据 type 参数分发请求
// ============================================================================

export default async function handler(req: any, res: any) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { type } = req.query;

  console.log(`🚀 AI Hub request: type=${type}, method=${req.method}`);

  try {
    switch (type) {
      case 'content':
        return await handleContent(req, res);
      
      case 'image':
        return await handleImage(req, res);
      
      case 'speech':
        return await handleSpeech(req, res);
      
      case 'stats':
        return await handleStats(req, res);
      
      default:
        return res.status(400).json({ 
          error: 'Invalid AI type. Use: content, image, speech, or stats',
          availableTypes: {
            content: 'GET /api/ai-hub?type=content - Generate news content',
            image: 'GET /api/ai-hub?type=image&headline=... - Generate image',
            speech: 'GET /api/ai-hub?type=speech&text=...&voice=male/female - Synthesize speech',
            stats: 'GET/POST /api/ai-hub?type=stats - View/manage model statistics'
          }
        });
    }
  } catch (error: any) {
    console.error(`❌ Error in AI Hub [${type}]:`, error.message);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      type
    });
  }
}
