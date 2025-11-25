
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { DailyBriefingData, NewsItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helper: Sleep ---
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Helper: Get Date Strings ---
const getDateContext = () => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().split('T')[0];

  return { today, yesterday };
};

// --- News Fetching (Text & Search) ---

export const fetchDailyTechNews = async (dateStr: string): Promise<DailyBriefingData> => {
  const modelId = 'gemini-2.5-flash';
  const { today, yesterday } = getDateContext();
  
  // We inject specific dates into the prompt to force the search tool to be relevant
  const prompt = `
    Role: Editor-in-Chief for "TechPulse Daily" (每日科技脉搏).
    Task: Curate the most significant global technology news strictly for **${today}** (and late ${yesterday}).
    Language: Simplified Chinese (简体中文).
    
    CRITICAL DATE CONSTRAINT:
    - You must ONLY include news that happened or was reported on **${yesterday}** or **${today}**.
    - **ABSOLUTELY NO NEWS OLDER THAN 48 HOURS.**
    - If a story is from last week (e.g., 7 days ago), DISCARD IT immediately.
    - Check the publication date of the search results carefully.

    Priority Order:
    1. **Artificial Intelligence (AI)**: LLMs, Agents, AGI breakthroughs, Sora, OpenAI, Gemini (Must be the 1st item).
    2. **Tech Giants**: Major strategic moves or product launches from Apple, Microsoft, Google, Meta, Tesla.
    3. **Semiconductors & Chips**: Nvidia, TSMC, Lithography, Quantum Computing.
    4. **Frontier Tech**: Brain-Computer Interfaces (BCI/Neuralink), Humanoid Robotics, Bio-tech.
    5. **Energy & Aerospace**: New Energy (Batteries, Nuclear Fusion), SpaceX, Starship, Deep Space Exploration.
    6. **Fundamental Science**: Physics, Material Science (Superconductors), Mathematics breakthroughs.

    Instructions:
    1. Use Google Search to find **Breaking News** and **Real-time Updates** for the query "Tech News ${today}".
    2. Select **6 to 8 distinct stories** covering the categories above.
    3. If there is no major news in a specific niche (e.g., BCI), skip it rather than reporting trivial info, but ALWAYS include AI and Chips.
    4. **Sort the output strictly** following the priority list above (AI news must appear first).
    5. Provide a detailed summary (3-5 sentences) covering key facts, context, and impact.
    
    CRITICAL OUTPUT INSTRUCTION:
    You must return a valid JSON array containing the news items. 
    Do not wrap the JSON in markdown code blocks (like \`\`\`json). Just return the raw JSON string.
    
    JSON Structure:
    [
      {
        "headline": "Catchy headline in Chinese",
        "summary": "Detailed summary in Chinese",
        "category": "Category name (e.g. 人工智能, 芯片技术, 航空航天)"
      }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // responseMimeType and responseSchema are NOT supported when using googleSearch
      },
    });

    let jsonString = response.text || "[]";
    
    // Clean up potential markdown formatting if the model ignores the "no markdown" instruction
    if (jsonString.includes("```json")) {
        jsonString = jsonString.replace(/```json/g, "").replace(/```/g, "");
    } else if (jsonString.includes("```")) {
        jsonString = jsonString.replace(/```/g, "");
    }
    
    const newsItems = JSON.parse(jsonString.trim()) as NewsItem[];
    
    // Extract grounding metadata
    const candidates = response.candidates;
    let groundingMetadata = null;
    if (candidates && candidates.length > 0) {
       groundingMetadata = candidates[0].groundingMetadata;
    }

    return {
      news: newsItems,
      groundingMetadata: groundingMetadata,
      date: dateStr
    };

  } catch (error) {
    console.error("Error fetching news:", error);
    throw new Error("Failed to generate valid news data. Please try again.");
  }
};

// --- Image Generation ---

export const generateNewsImage = async (headline: string): Promise<string | null> => {
  const modelId = 'gemini-2.5-flash-image';
  // Optimized prompt for speed and style consistency
  const prompt = `Cyberpunk concept art: "${headline}". High tech, neon, cinematic lighting. No text.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.warn("Image gen failed for:", headline, e);
    return null;
  }
};

// --- Audio Generation (TTS) ---

export const generateNewsAudio = async (text: string, voice: 'Male' | 'Female'): Promise<ArrayBuffer | null> => {
  const modelId = 'gemini-2.5-flash-preview-tts';
  const voiceName = voice === 'Male' ? 'Puck' : 'Kore';
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName }
            }
          }
        }
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        throw new Error("No audio data in response");
      }

      // Decode Base64 to ArrayBuffer (Raw PCM)
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;

    } catch (e) {
      console.warn(`TTS generation failed (Attempt ${attempt}/${MAX_RETRIES})`, e);
      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 500ms, 1000ms, etc.
        await sleep(500 * attempt);
      } else {
        console.error("All TTS attempts failed.");
        return null;
      }
    }
  }
  return null;
};


// --- Chatbot ---

export const askFollowUpQuestion = async (newsContext: NewsItem[], question: string): Promise<string> => {
  const modelId = 'gemini-3-pro-preview';
  
  // Serialize news to string for context
  const contextStr = newsContext.map(n => `Title: ${n.headline}\nSummary: ${n.summary}`).join('\n\n');

  const prompt = `
    Context: The user is reading the following tech news:
    ---
    ${contextStr}
    ---
    
    User Question: ${question}
    
    Answer the user's question based on the context provided or general knowledge. Answer in Chinese.
  `;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
  });

  return response.text || "抱歉，我无法回答这个问题。";
};
