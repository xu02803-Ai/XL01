
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
    console.log("🔄 Fetching news from /api/generate-content...");
    const response = await fetch('/api/generate-content?dateStr=' + encodeURIComponent(dateStr), {
      method: 'GET'
    });

    console.log("📨 API Response Status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error Response:", errorText);
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("📦 Parsed Response:", data);
    
    if (!data.success) {
      console.error("❌ API returned success=false:", data.error);
      throw new Error(data.error || "Failed to fetch news");
    }

    let jsonString = data.data || "[]";
    console.log("🔍 JSON String (first 200 chars):", jsonString.substring(0, 200));
    
    // Clean up potential markdown formatting
    if (jsonString.includes("```json")) {
        jsonString = jsonString.replace(/```json/g, "").replace(/```/g, "");
    } else if (jsonString.includes("```")) {
        jsonString = jsonString.replace(/```/g, "");
    }
    
    const newsItems = JSON.parse(jsonString.trim()) as NewsItem[];
    console.log("✅ Successfully parsed news items:", newsItems.length);

    return {
      news: newsItems,
      groundingMetadata: null,
      date: dateStr
    };

  } catch (error) {
    console.error("❌ Error fetching news:", error);
    throw error;
  }
};

// --- Image Generation ---

export const generateNewsImage = async (headline: string): Promise<string | null> => {
  try {
    console.log("🖼️ Requesting image for:", headline);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
    
    const response = await fetch(`/api/generate-image?headline=${encodeURIComponent(headline)}`, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn("Image API error:", response.status);
      return null;
    }

    const data = await response.json();
    if (!data.success) {
      console.warn("Image generation failed:", data.error);
      return null;
    }

    // Convert base64 to data URL for display
    if (data.data && data.mimeType) {
      console.log("✅ Image received successfully");
      return `data:${data.mimeType};base64,${data.data}`;
    }

    return null;
  } catch (e: any) {
    if (e.name === 'AbortError') {
      console.warn("Image generation timeout for:", headline);
    } else {
      console.warn("Image gen failed for:", headline, e);
    }
    return null;
  }
};

// --- Audio Generation (TTS) ---

export const generateNewsAudio = async (text: string, voice: 'Male' | 'Female'): Promise<ArrayBuffer | null> => {
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`/api/synthesize-speech?text=${encodeURIComponent(text)}&voice=${voice}`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Audio generation failed");
      }

      if (!data.data) {
        throw new Error("No audio data in response");
      }

      // Decode Base64 to ArrayBuffer
      const binaryString = atob(data.data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;

    } catch (e) {
      console.warn(`TTS generation failed (Attempt ${attempt}/${MAX_RETRIES})`, e);
      if (attempt < MAX_RETRIES) {
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
  // Placeholder implementation
  return "此功能暂未实现。";
};
