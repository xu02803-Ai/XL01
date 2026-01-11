import OpenAI from 'openai';

// 初始化 OpenAI 客户端，指向阿里云千问的兼容端点
const openai = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

/**
 * POST /api/qwen-chat
 * 
 * 千问 API - OpenAI 兼容模式
 * 
 * 请求体:
 * {
 *   "messages": [
 *     { "role": "user", "content": "你好" }
 *   ],
 *   "model": "qwen-plus" // 可选，默认 qwen-plus
 * }
 */
export default async function handler(req: any, res: any) {
  // CORS 配置
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { messages, model = 'qwen-plus', stream = false } = req.method === 'GET' 
      ? req.query 
      : (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};

    if (!messages) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    console.log(`🚀 Calling Qwen (${model}) with ${Array.isArray(messages) ? messages.length : 1} messages`);

    const response = await openai.chat.completions.create({
      model: model,
      messages: Array.isArray(messages) ? messages : [{ role: 'user', content: messages }],
      temperature: 0.7,
      top_p: 0.8,
      max_tokens: 2000,
      stream: stream,
    });

    return res.status(200).json({
      success: true,
      message: response.choices?.[0]?.message || { role: 'assistant', content: '' },
      model: model,
      usage: response.usage,
    });
  } catch (error: any) {
    console.error('❌ Qwen API Error:', error);
    
    // 详细的错误信息用于调试
    const errorDetails = {
      message: error.message,
      status: error.status,
      code: error.code,
    };

    // 如果是 API 密钥错误
    if (error.status === 401) {
      return res.status(401).json({
        error: 'Invalid or missing API key',
        hint: 'Check DASHSCOPE_API_KEY environment variable',
        details: errorDetails,
      });
    }

    return res.status(error.status || 500).json({
      error: 'Failed to call Qwen API',
      details: errorDetails,
    });
  }
}
