import axios from 'axios';

// 确保环境变量存在，否则提前报错，方便排查
const qwenApiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;

// 千问API端点
const QWEN_TEXT_API = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
const QWEN_TTS_API = 'https://dashscope.aliyuncs.com/api/v1/services/tts/text-to-speech';

// 千问模型列表 - 性价比优化版本
// 文本生成：优先使用免费/低价模型
const QWEN_TEXT_MODELS = [
  'qwen-plus',          // 性价比最高，主要推荐（0.8元/百万tokens）
  'qwen-turbo',         // 次级快速模型（1.5元/百万tokens）
  'qwen-coder-plus',    // 代码和通用文本（1.5元/百万tokens）
];

// 语音合成：使用免费的 sambert 模型族
const QWEN_TTS_MODELS = [
  'sambert-zhichu-v1',  // 免费中文语音合成模型 ✅
  'cosyvoice-v1',       // 付费高质量备选（需付费）
];

export default async function handler(req: any, res: any) {
  // 处理跨域
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 1. 基础环境检查
  if (!qwenApiKey) {
    console.error("❌ 服务器未配置 QWEN_API_KEY 或 DASHSCOPE_API_KEY");
    return res.status(500).json({ error: "服务器未配置 QWEN_API_KEY" });
  }

  try {
    // 2. 确保获取了 body（修复解构报错）
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const action = req.query.action || body?.action;

    switch (action) {
      case 'text':
      case 'generate-text':
        return handleTextGeneration(req, res);

      case 'speech':
      case 'synthesize-speech':
        return handleSpeechSynthesis(req, res);

      case 'image':
      case 'generate-image':
        return handleImageGeneration(req, res);

      default:
        // 默认行为：如果有 text 字段则生成文本
        const body_check = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        if (body_check?.text || req.query?.text) {
          return handleTextGeneration(req, res);
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
async function handleTextGeneration(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const params = req.method === 'GET' ? req.query : (typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
  const { text, prompt, dateStr } = params || {};
  const inputContent = text || prompt || buildNewsPrompt(dateStr);

  if (!inputContent) {
    return res.status(400).json({ error: "Missing content/prompt in request" });
  }

  // 尝试所有可用的千问模型
  for (const modelId of QWEN_TEXT_MODELS) {
    try {
      console.log(`🚀 尝试使用千问模型: ${modelId}...`);

      const response = await axios.post(
        QWEN_TEXT_API,
        {
          model: modelId,
          messages: [
            {
              role: 'user',
              content: inputContent
            }
          ],
          parameters: {
            max_tokens: 2000,
            temperature: 0.7,
            top_p: 0.8
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${qwenApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const result = response.data;
      if (result.code === 200 || result.status_code === '200' || !result.code) {
        const textContent = result.output?.text || result.result?.output?.text || '';
        if (textContent) {
          console.log(`✅ 文本生成成功，使用模型: ${modelId}`);
          return res.status(200).json({
            success: true,
            data: textContent,
            model: modelId
          });
        }
      }
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.warn(`⚠️ 模型 ${modelId} 失败:`, errorMsg);

      // 检查是否为配额或速率限制错误
      if (errorMsg.includes('rate_limit') ||
        errorMsg.includes('429') ||
        errorMsg.includes('quota') ||
        errorMsg.includes('RESOURCE_EXHAUSTED')) {
        console.warn(`🔄 ${modelId} 配额已用，尝试降级...`);
        continue;
      }

      // 其他错误也继续尝试下一个模型
      continue;
    }
  }

  return res.status(500).json({
    error: "所有文本生成通道均不可用",
    details: "没有可用的千问模型"
  });
}

/**
 * 处理语音合成
 */
async function handleSpeechSynthesis(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const params = req.method === 'GET' ? req.query : (typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
  const { text, voice = 'female' } = params || {};

  if (!text) {
    return res.status(400).json({ error: "Missing text in request" });
  }

  // 尝试所有可用的千问TTS模型
  for (const modelId of QWEN_TTS_MODELS) {
    try {
      console.log(`🎙️ 尝试语音合成，模型: ${modelId}, 声音: ${voice}`);

      const response = await axios.post(
        QWEN_TTS_API,
        {
          model: modelId,
          input: {
            text: text
          },
          parameters: {
            voice: voice === 'female' ? 'xiaoxiao' : 'xiaogang', // 千问的声音参数
            rate: 1.0,
            volume: 50
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${qwenApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000,
          responseType: 'arraybuffer'
        }
      );

      const audioData = response.data;
      if (audioData && audioData.byteLength > 0) {
        console.log(`✅ 语音合成成功，使用模型 ${modelId}`);
        return res.status(200).json({
          success: true,
          data: audioData.toString('base64'),
          mimeType: 'audio/mpeg',
          model: modelId
        });
      }

    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.warn(`⚠️ 模型 ${modelId} 失败:`, errorMsg);

      // 检查是否为配额错误
      if (errorMsg.includes('rate_limit') ||
        errorMsg.includes('quota') ||
        errorMsg.includes('429') ||
        errorMsg.includes('RESOURCE_EXHAUSTED')) {
        console.warn(`🔄 ${modelId} 配额已用，尝试降级...`);
        continue;
      }

      // 其他错误也继续尝试下一个模型
      continue;
    }
  }

  return res.status(500).json({
    error: "所有语音合成通道均不可用",
    details: "没有可用的千问TTS模型"
  });
}

/**
 * 处理图片生成（生成提示词）
 */
async function handleImageGeneration(req: any, res: any) {
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

  // 尝试所有可用的千问模型
  for (const modelId of QWEN_TEXT_MODELS) {
    try {
      console.log(`🖼️ 正在生成图片提示词，使用模型: ${modelId}...`);

      const response = await axios.post(
        QWEN_TEXT_API,
        {
          model: modelId,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          parameters: {
            max_tokens: 500,
            temperature: 0.8,
            top_p: 0.9
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${qwenApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const result = response.data;
      if (result.code === 200 || result.status_code === '200' || !result.code) {
        const imagePrompt = result.output?.text || result.result?.output?.text || '';
        if (imagePrompt) {
          // 使用免费的图片生成服务
          const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}`;

          console.log(`✅ 图片提示词生成成功，使用模型: ${modelId}`);
          return res.status(200).json({
            success: true,
            prompt: imagePrompt,
            imageUrl: imageUrl,
            isUrl: true,
            model: modelId
          });
        }
      }

    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.warn(`⚠️ 模型 ${modelId} 失败:`, errorMsg);

      // 检查是否为配额错误
      if (errorMsg.includes('rate_limit') ||
        errorMsg.includes('quota') ||
        errorMsg.includes('429') ||
        errorMsg.includes('RESOURCE_EXHAUSTED')) {
        console.warn(`🔄 ${modelId} 配额已用，尝试降级...`);
        continue;
      }

      // 其他错误也继续尝试下一个模型
      continue;
    }
  }

  return res.status(500).json({
    error: "图片生成服务调用失败",
    details: "没有可用的千问模型"
  });
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

  return `Role: Editor-in-Chief for "TechPulse Daily" (每日科技脉搏).
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

Return as valid JSON array with objects containing: title, content, source, url, date.
Example format:
[
  {
    "title": "标题",
    "content": "内容摘要",
    "source": "来源",
    "url": "链接",
    "date": "${today}"
  }
]`;
}
