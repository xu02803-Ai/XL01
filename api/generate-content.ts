import { callGeminiWithFallback, getModelStats } from "./gemini-utils";

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

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
    
    // Clean markdown if present
    jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Validate JSON
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
    
    res.status(200).json({ success: true, data: jsonString });
  } catch (error: any) {
    console.error("❌ Content generation error:", error.message);
    res.status(500).json({ 
      success: false,
      error: error.message || "Internal server error" 
    });
  }
}
