
import { DailyBriefingData, NewsItem } from "../types";

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

// --- News Fetching (via API) ---

export const fetchDailyTechNews = async (dateStr: string): Promise<DailyBriefingData> => {
  const { today, yesterday } = getDateContext();
  
  try {
    const response = await fetch('/api/news?dateStr=' + encodeURIComponent(dateStr), {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || "Failed to fetch news");
    }

    let jsonString = data.data || "[]";
    
    // Clean up potential markdown formatting
    if (jsonString.includes("```json")) {
        jsonString = jsonString.replace(/```json/g, "").replace(/```/g, "");
    } else if (jsonString.includes("```")) {
        jsonString = jsonString.replace(/```/g, "");
    }
    
    const newsItems = JSON.parse(jsonString.trim()) as NewsItem[];

    return {
      news: newsItems,
      groundingMetadata: null,
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
