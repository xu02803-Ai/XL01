import OpenAI from 'openai';
import { NextResponse } from 'next/server';

// 初始化 OpenAI 客户端，指向阿里云千问的兼容端点
const openai = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

/**
 * POST /api/qwen/chat
 * 
 * 最佳实践：使用 OpenAI 兼容模式调用千问
 * 
 * 请求体:
 * {
 *   "messages": [
 *     { "role": "user", "content": "你好" }
 *   ],
 *   "model": "qwen-plus" // 可选，默认 qwen-plus
 * }
 * 
 * 注意：Vercel Free 版有 10 秒超时限制
 * 如果使用 qwen-max，建议启用流式输出 (stream: true)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, model = 'qwen-plus', stream = false } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'messages array is required' },
        { status: 400 }
      );
    }

    console.log(`🚀 Calling Qwen (${model}) with ${messages.length} messages`);

    const response = await openai.chat.completions.create({
      model: model,
      messages: messages,
      temperature: 0.7,
      top_p: 0.8,
      max_tokens: 2000,
      stream: stream,
    });

    if (stream) {
      // 处理流式响应
      const stream = response as any;
      return new Response(stream.toReadableStream());
    } else {
      // 处理普通响应
      return NextResponse.json({
        success: true,
        message: response.choices[0].message,
        model: model,
        usage: response.usage,
      });
    }
  } catch (error: any) {
    console.error('❌ Qwen API Error:', error);
    
    // 详细的错误信息用于调试
    const errorDetails = {
      message: error.message,
      status: error.status,
      code: error.code,
    };

    // 如果是超时错误（Vercel 限制）
    if (error.status === 504 || error.message?.includes('timeout')) {
      return NextResponse.json(
        {
          error: 'Request timeout (Vercel Free has 10s limit)',
          hint: 'Try using qwen-plus instead of qwen-max, or enable streaming for longer responses',
          details: errorDetails,
        },
        { status: 504 }
      );
    }

    // 如果是 API 密钥错误
    if (error.status === 401) {
      return NextResponse.json(
        {
          error: 'Invalid or missing API key',
          hint: 'Check DASHSCOPE_API_KEY environment variable in Vercel',
          details: errorDetails,
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to call Qwen API',
        details: errorDetails,
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * GET /api/qwen/chat
 * 
 * 快速测试端点
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const prompt = searchParams.get('prompt') || '你好';
  const model = searchParams.get('model') || 'qwen-plus';

  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
    });

    return NextResponse.json({
      success: true,
      prompt: prompt,
      response: response.choices[0].message.content,
      model: model,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 500 }
    );
  }
}
