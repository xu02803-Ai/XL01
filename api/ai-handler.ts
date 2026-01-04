import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI, Modality } from "@google/genai";

// 确保环境变量存在，否则提前报错，方便排查
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const genAIModality = apiKey ? new GoogleGenAI({ apiKey }) : null;

export default async function handler(req: any, res: any) {
  // 处理跨域
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 1. 基础环境检查
  if (!genAI || !genAIModality) {
    console.error("❌ 服务器未配置 GEMINI_API_KEY");
    return res.status(500).json({ error: "服务器未配置 GEMINI_API_KEY" });
  }

  try {
    // 2. 确保获取了 body（修复解构报错）
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const action = req.query.action || body?.action;

    switch (action) {
      case 'text':
      case 'generate-text':
        return handleTextGeneration(req, res, genAI);

      case 'speech':
      case 'synthesize-speech':
        return handleSpeechSynthesis(req, res, genAIModality);

      case 'image':
      case 'generate-image':
        return handleImageGeneration(req, res, genAI);

      default:
        // 默认行为：如果有 text 字段则生成文本
        const body_check = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        if (body_check?.text || req.query?.text) {
          return handleTextGeneration(req, res, genAI);
        }
        return res.status(400).json({ error: "Missing action parameter. Use ?action=text|speech|image" });
    }
  } catch (error: any) {
    console.error("❌ AI Handler Error:", error.message);
    return res.status(500).json({ error: "AI 服务调用失败", details: error.message });
  }
}

/**
 * 处理文本生成（新闻、内容等）
 */
async function handleTextGeneration(req: any, res: any, genAI: GoogleGenerativeAI | null) {
  if (!genAI) {
    return res.status(500).json({ error: "AI 服务未初始化" });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const params = req.method === 'GET' ? req.query : (typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
  const { text, prompt, dateStr } = params || {};
  const inputContent = text || prompt || buildNewsPrompt(dateStr);

  if (!inputContent) {
    return res.status(400).json({ error: "Missing content/prompt in request" });
  }

  try {
    console.log("🚀 尝试使用 Gemini 2.5 Flash...");

    // 优先使用 Gemini 2.5（最新最强）
    const model25 = genAI.getGenerativeModel({ model: "gemini-2.5-flash-001" });
    const result = await model25.generateContent(inputContent);
    const response = await result.response;

    return res.status(200).json({
      success: true,
      data: response.text(),
      model: "gemini-2.5-flash-001"
    });

  } catch (error: any) {
    // 核心逻辑：检测是否为配额错误
    const isQuotaExceeded = error.message?.includes('429') ||
      error.message?.includes('quota') ||
      error.message?.includes('RESOURCE_EXHAUSTED') ||
      error.message?.includes('rate limit') ||
      error.message?.includes('404');

    if (isQuotaExceeded) {
      console.warn("⚠️ 2.5 Flash 额度用尽，正在尝试 Gemini 2.0 Flash...");

      try {
        const model20 = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result20 = await model20.generateContent(inputContent);
        const response20 = await result20.response;

        return res.status(200).json({
          success: true,
          data: response20.text(),
          model: "gemini-2.0-flash (Fallback)"
        });
      } catch (fallbackError2: any) {
        // 2.0 也失败，尝试 2.0 Flash-Lite
        console.warn("⚠️ 2.0 Flash 配额用尽，尝试 Gemini 2.0 Flash-Lite...");
        try {
          const modelLite = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
          const resultLite = await modelLite.generateContent(inputContent);
          const responseLite = await resultLite.response;

          return res.status(200).json({
            success: true,
            data: responseLite.text(),
            model: "gemini-2.0-flash-lite (Final Fallback)"
          });
        } catch (fallbackError3: any) {
          return res.status(500).json({
            error: "所有文本生成通道均不可用（2.5、2.0 和 Lite 都已达到配额）",
            details: fallbackError3.message
          });
        }
      }
    }

    // 其他错误
    return res.status(500).json({
      error: "文本生成服务调用失败",
      details: error.message
    });
  }
}

/**
 * 处理语音合成
 */
async function handleSpeechSynthesis(req: any, res: any, genAIModality: GoogleGenAI | null) {
  if (!genAIModality) {
    return res.status(500).json({ error: "TTS 服务未初始化" });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const params = req.method === 'GET' ? req.query : (typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
  const { text, voice = 'female' } = params || {};

  if (!text) {
    return res.status(400).json({ error: "Missing text in request" });
  }

  // TTS 模型列表
  const ttsModels = [
    'gemini-2.5-flash-001',         // 优先版本
    'gemini-2.0-flash',             // 次级降级
    'gemini-2.0-flash-lite',        // 保底模型
  ];

  for (const modelId of ttsModels) {
    try {
      console.log(`🎙️ 尝试语音合成，模型: ${modelId}, 声音: ${voice}`);

      const response = await genAIModality.models.generateContent({
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
                voiceName: voice
              }
            }
          }
        }
      } as any);

      const part = response.candidates?.[0]?.content?.parts?.[0];

      if (part && "inlineData" in part && part.inlineData) {
        console.log(`✅ 语音合成成功，使用模型 ${modelId}`);
        return res.status(200).json({
          success: true,
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'audio/mpeg',
          model: modelId
        });
      }

    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.warn(`⚠️ 模型 ${modelId} 失败:`, errorMsg);

      // 检查是否为配额错误
      if (errorMsg.includes('RESOURCE_EXHAUSTED') ||
        errorMsg.includes('quota') ||
        errorMsg.includes('429')) {
        console.warn(`🔄 ${modelId} 配额已用，尝试降级...`);
        continue;
      }

      // 其他错误也继续尝试下一个模型
      continue;
    }
  }

  return res.status(500).json({
    error: "所有语音合成通道均不可用",
    details: "没有可用的 TTS 模型"
  });
}

/**
 * 处理图片生成（生成提示词）
 */
async function handleImageGeneration(req: any, res: any, genAI: GoogleGenerativeAI | null) {
  if (!genAI) {
    return res.status(500).json({ error: "AI 服务未初始化" });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const params = req.method === 'GET' ? req.query : (typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
  const { headline } = params || {};

  if (!headline) {
    return res.status(400).json({ error: "Missing headline in request" });
  }

  const prompt = `Given the news headline: "${headline}"
Generate an image prompt that describes a fitting visual representation. The prompt should be vivid, descriptive, and suitable for AI image generation.
Return ONLY the image prompt, no additional text.`;

  try {
    console.log("🖼️ 正在生成图片提示词...");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-001" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const imagePrompt = response.text();

    // 使用免费的图片生成服务
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}`;

    return res.status(200).json({
      success: true,
      prompt: imagePrompt,
      imageUrl: imageUrl,
      isUrl: true,
      model: "gemini-2.5-flash-001"
    });

  } catch (error: any) {
    // 检测配额错误
    const isQuotaExceeded = error.message?.includes('429') ||
      error.message?.includes('quota') ||
      error.message?.includes('RESOURCE_EXHAUSTED');

    if (isQuotaExceeded) {
      console.warn("⚠️ 2.5 Flash 配额用尽，尝试 Gemini 2.0 Flash...");

      try {
        const model20 = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result20 = await model20.generateContent(prompt);
        const response20 = await result20.response;
        let imagePrompt = response20.text();

        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}`;

        return res.status(200).json({
          success: true,
          prompt: imagePrompt,
          imageUrl: imageUrl,
          isUrl: true,
          model: "gemini-2.0-flash (Fallback)"
        });
      } catch (fallbackError2: any) {
        // 2.0 也失败，尝试 2.0 Flash-Lite
        console.warn("⚠️ 2.0 Flash 配额用尽，尝试 Gemini 2.0 Flash-Lite...");
        try {
          const modelLite = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
          const resultLite = await modelLite.generateContent(prompt);
          const responseLite = await resultLite.response;
          let imageLitePrompt = responseLite.text();

          const imageLiteUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imageLitePrompt)}`;

          return res.status(200).json({
            success: true,
            prompt: imageLitePrompt,
            imageUrl: imageLiteUrl,
            isUrl: true,
            model: "gemini-2.0-flash-lite (Final Fallback)"
          });
        } catch (fallbackError3: any) {
          return res.status(500).json({
            error: "图片提示词生成失败（所有模型都已达到配额）",
            details: fallbackError3.message
          });
        }
      }
    }

    return res.status(500).json({
      error: "图片生成服务调用失败",
      details: error.message
    });
  }
}

/**
 * 构建新闻生成提示词
 */
function buildNewsPrompt(dateStr?: string): string {
  const now = new Date();
  const today = dateStr || now.toISOString().split('T')[0];

  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().split('T')[0];

  return `
Role: Editor-in-Chief for "TechPulse Daily" (每日科技脉搏).
Task: Curate the most significant global technology news strictly for **${today}** (and late ${yesterday}).
Language: Simplified Chinese (简体中文).

CRITICAL DATE CONSTRAINT:
- You must ONLY include news that happened or was reported on **${yesterday}** or **${today}**.
- **ABSOLUTELY NO NEWS OLDER THAN 48 HOURS.**
- If a story is from last week, DISCARD IT immediately.

[Rest of news generation instructions...]

Return as JSON array with objects containing: title, content, source, url, date.
`;
}
