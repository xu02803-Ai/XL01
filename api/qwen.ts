import OpenAI from 'openai';

// 初始化 OpenAI 客户端，指向阿里云千问的兼容端点
const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  defaultHeaders: {
    'User-Agent': 'Qwen-API-Client/1.0'
  }
});

// 支持的模型列表（按性价比排序）
const TEXT_MODELS = ['qwen-plus', 'qwen-turbo', 'qwen-coder-plus'];
const TTS_MODELS = ['sambert-zhichu-v1', 'cosyvoice-v1'];

/**
 * 文本生成 - 使用 OpenAI 兼容模式
 * 
 * @param prompt 用户输入的提示词
 * @param model 可选的模型名称（默认 qwen-plus）
 * @returns 生成的文本内容
 */
export async function generateText(prompt: string, model: string = 'qwen-plus'): Promise<string> {
  if (!prompt) {
    throw new Error('Prompt is required');
  }

  // 验证模型是否在支持列表中
  if (!TEXT_MODELS.includes(model)) {
    console.warn(`⚠️ Model ${model} not in recommended list, using qwen-plus instead`);
    model = 'qwen-plus';
  }

  try {
    console.log(`🚀 Calling Qwen model: ${model}`);

    const response = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      top_p: 0.8,
      max_tokens: 2000,
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from Qwen API');
    }

    console.log(`✅ Text generation successful with model: ${model}`);
    return content;
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    console.error(`❌ Error with model ${model}:`, errorMsg);

    // 如果是配额错误，自动降级
    if (errorMsg.includes('rate_limit') || 
        errorMsg.includes('429') || 
        errorMsg.includes('quota') ||
        errorMsg.includes('RESOURCE_EXHAUSTED')) {
      console.warn(`🔄 ${model} quota exceeded, trying next model...`);
      
      const nextModel = TEXT_MODELS.find(m => m !== model);
      if (nextModel) {
        return generateText(prompt, nextModel);
      }
    }

    throw error;
  }
}

/**
 * 新闻生成 - 生成科技新闻摘要
 * 
 * @param dateStr 可选的日期字符串
 * @returns JSON 格式的新闻数组
 */
export async function generateNews(dateStr?: string): Promise<any[]> {
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

Priority Order:
1. **Artificial Intelligence (AI)**: LLMs, Agents, AGI breakthroughs
2. **Tech Giants**: Apple, Microsoft, Google, Meta, Tesla major moves
3. **Semiconductors & Chips**: Nvidia, TSMC, Quantum Computing
4. **Frontier Tech**: Brain-Computer Interfaces, Robotics, Bio-tech
5. **Energy & Aerospace**: New Energy, SpaceX, Space Exploration
6. **Fundamental Science**: Physics, Material Science, Mathematics

Return ONLY valid JSON array (no markdown, no code blocks):
[
  {
    "headline": "Headline in Chinese",
    "summary": "Detailed summary in Chinese",
    "category": "Category name (e.g. 人工智能, 芯片技术)"
  }
]`;

  const content = await generateText(prompt, 'qwen-plus');
  
  // 清理 markdown 格式
  let jsonString = content.trim();
  jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('Failed to parse news JSON:', jsonString);
    throw new Error('Invalid JSON response from Qwen');
  }
}

/**
 * 图片提示词生成
 * 
 * @param headline 新闻标题
 * @returns 生成的图片提示词
 */
export async function generateImagePrompt(headline: string): Promise<string> {
  const prompt = `Given the news headline: "${headline}"
Generate an image prompt that describes a fitting visual representation. The prompt should be vivid, descriptive, and suitable for AI image generation.
Return ONLY the image prompt, no additional text.`;

  return generateText(prompt, 'qwen-plus');
}

/**
 * 语音合成 - 使用文本转语音
 * 注意：OpenAI 兼容模式可能不支持 TTS，建议直接调用千问 TTS API
 * 
 * @param text 需要合成的文本
 * @param voice 声音类型 (female/male)
 * @returns 语音文件的 URL 或 base64
 */
export async function synthesizeSpeech(text: string, voice: string = 'female'): Promise<string> {
  if (!text) {
    throw new Error('Text is required for speech synthesis');
  }

  // OpenAI 兼容模式可能不支持 TTS，这里作为备用方案
  // 实际的 TTS 实现应该直接调用千问 TTS API
  console.warn('⚠️ TTS not yet fully supported in OpenAI compatible mode');
  
  // 返回一个占位符，实际项目应该调用真实的 TTS API
  return `data:audio/mpeg;base64,//NExAAiYAIAFIABhADgEgAEBAP/3/w==`;
}

/**
 * 默认导出 API 处理函数（用于 Vercel 边界函数）
 */
export default async function handler(req: any, res: any) {
  // CORS 配置
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, text, prompt, headline, voice } = req.method === 'GET' ? req.query : (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};

  try {
    switch (action) {
      case 'text':
      case 'generate-text':
        const textContent = await generateText(text || prompt || '生成一个技术新闻摘要');
        return res.status(200).json({ success: true, data: textContent, model: 'qwen-plus' });

      case 'news':
      case 'generate-news':
        const news = await generateNews();
        return res.status(200).json({ success: true, data: news });

      case 'image-prompt':
      case 'generate-image-prompt':
        if (!headline) {
          return res.status(400).json({ error: 'headline parameter required' });
        }
        const imagePrompt = await generateImagePrompt(headline);
        return res.status(200).json({ success: true, data: imagePrompt });

      case 'speech':
      case 'synthesize-speech':
        if (!text) {
          return res.status(400).json({ error: 'text parameter required' });
        }
        const audio = await synthesizeSpeech(text, voice);
        return res.status(200).json({ success: true, data: audio, mimeType: 'audio/mpeg' });

      default:
        return res.status(400).json({ 
          error: 'Missing or invalid action parameter',
          supported: ['text', 'news', 'image-prompt', 'speech']
        });
    }
  } catch (error: any) {
    console.error('❌ API Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      details: error.message
    });
  }
}
