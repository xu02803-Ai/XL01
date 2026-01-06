// DeepSeek API 配置
// 确保环境变量存在，否则提前报错，方便排查
const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

export default async function handler(req: any, res: any) {
  // 处理跨域
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 1. 基础环境检查
  if (!deepseekApiKey) {
    console.error("❌ 服务器未配置 DEEPSEEK_API_KEY");
    return res.status(500).json({ error: "服务器未配置 DEEPSEEK_API_KEY" });
  }

  try {
    // 2. 确保获取了 body（修复解构报错）
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const action = req.query.action || body?.action;

    switch (action) {
      case 'text':
      case 'generate-text':
        return handleTextGeneration(req, res, deepseekApiKey);

      case 'image':
      case 'generate-image':
        return handleImageGeneration(req, res, deepseekApiKey);

      default:
        // 默认行为：如果有 text 字段则生成文本
        const body_check = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        if (body_check?.text || req.query?.text) {
          return handleTextGeneration(req, res, deepseekApiKey);
        }
        return res.status(400).json({ error: "Missing action parameter. Use ?action=text|image" });
    }
  } catch (error: any) {
    console.error("❌ AI Handler Error:", error.message);
    return res.status(500).json({ error: "AI 服务调用失败", details: error.message });
  }
}

/**
 * 处理文本生成（新闻、内容等）
 */
async function handleTextGeneration(req: any, res: any, apiKey: string) {
  if (!apiKey) {
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
    console.log("🚀 尝试使用 DeepSeek Chat (V3)...");

    // 使用 DeepSeek Chat 模型
    const response = await callDeepSeekAPI(apiKey, inputContent, "deepseek-chat");
    
    return res.status(200).json({
      success: true,
      data: response,
      model: "deepseek-chat"
    });

  } catch (error: any) {
    // 检测是否为配额或速率限制错误
    const isQuotaExceeded = error.message?.includes('429') ||
      error.message?.includes('quota') ||
      error.message?.includes('rate limit') ||
      error.status === 429;

    if (isQuotaExceeded) {
      console.warn("⚠️ DeepSeek Chat 配额用尽或速率限制，尝试 DeepSeek Reasoner...");

      try {
        const response = await callDeepSeekAPI(apiKey, inputContent, "deepseek-reasoner");
        
        return res.status(200).json({
          success: true,
          data: response,
          model: "deepseek-reasoner (Fallback)"
        });
      } catch (fallbackError: any) {
        return res.status(500).json({
          error: "所有文本生成通道均不可用",
          details: fallbackError.message
        });
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
 * 调用 DeepSeek API
 */
async function callDeepSeekAPI(apiKey: string, prompt: string, model: "deepseek-chat" | "deepseek-reasoner"): Promise<string> {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 1,
      max_tokens: model === "deepseek-reasoner" ? 8000 : 4000,
      ...(model === "deepseek-reasoner" && { 
        thinking: { 
          type: "enabled",
          budget_tokens: 4000
        }
      })
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    const error: any = new Error(errorData.error?.message || response.statusText);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * 处理图片生成（生成提示词）
 */
async function handleImageGeneration(req: any, res: any, apiKey: string) {
  if (!apiKey) {
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

    const imagePrompt = await callDeepSeekAPI(apiKey, prompt, "deepseek-chat");

    // 使用免费的图片生成服务
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}`;

    return res.status(200).json({
      success: true,
      prompt: imagePrompt,
      imageUrl: imageUrl,
      isUrl: true,
      model: "deepseek-chat"
    });

  } catch (error: any) {
    // 检测配额错误
    const isQuotaExceeded = error.message?.includes('429') ||
      error.message?.includes('quota') ||
      error.status === 429;

    if (isQuotaExceeded) {
      console.warn("⚠️ DeepSeek Chat 配额用尽，尝试 DeepSeek Reasoner...");

      try {
        const imagePrompt = await callDeepSeekAPI(apiKey, prompt, "deepseek-reasoner");

        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}`;

        return res.status(200).json({
          success: true,
          prompt: imagePrompt,
          imageUrl: imageUrl,
          isUrl: true,
          model: "deepseek-reasoner (Fallback)"
        });
      } catch (fallbackError: any) {
        return res.status(500).json({
          error: "图片提示词生成失败",
          details: fallbackError.message
        });
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
