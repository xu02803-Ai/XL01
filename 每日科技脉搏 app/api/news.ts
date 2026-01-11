import { GoogleGenerativeAI } from '@google/generative-ai';

// 初始化 Gemini 客户端
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

const getDateContext = () => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().split('T')[0];

  return { today, yesterday };
};

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { today, yesterday } = getDateContext();

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

    // Try all available Gemini models
    for (const modelId of GEMINI_MODELS) {
      try {
        console.log(`🚀 Calling Gemini model: ${modelId}`);

        const modelInstance = genAI.getGenerativeModel({ model: modelId });
        
        const response = await modelInstance.generateContent({
          contents: [
            {
              role: 'user',
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
            maxOutputTokens: 2000,
          }
        });

        const textContent = response.response.text();
        if (textContent) {
          let jsonString = textContent.trim();
          // Clean markdown if present
          jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');
          
          // Validate JSON
          JSON.parse(jsonString);
          
          console.log(`✅ News generated successfully using model: ${modelId}`);
          return res.status(200).json({ success: true, data: jsonString });
        }
      } catch (error: any) {
        const errorMsg = error.message || String(error);
        console.warn(`⚠️ Model ${modelId} failed:`, errorMsg);

        // Check if it's a quota/rate limit error
        if (errorMsg.includes('RESOURCE_EXHAUSTED') ||
          errorMsg.includes('429') ||
          errorMsg.includes('rate limit') ||
          errorMsg.includes('quota')) {
          console.warn(`🔄 ${modelId} rate limit exceeded, trying fallback...`);
          continue;
        }

        continue;
      }
    }

    return res.status(500).json({
      success: false,
      error: "All Gemini models unavailable"
    });
  } catch (error: any) {
    console.error("API Error:", error);
    res.status(500).json({ 
      success: false,
      error: error?.message || "Internal server error" 
    });
  }
}

