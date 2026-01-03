
import { DailyBriefingData, NewsItem } from "../types";

// --- Helper: Sleep ---
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Helper: Get Auth Token ---
const getAuthToken = (): string => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    return token || '';
  }
  return '';
};

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
  const token = getAuthToken();
  
  try {
    console.log("🔄 Fetching news from /api/ai-handler...");
    const response = await fetch('/api/ai-handler?action=text&dateStr=' + encodeURIComponent(dateStr), {
      method: 'GET',
      headers: token ? {
        'Authorization': `Bearer ${token}`,
      } : {},
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

    // ai-handler 返回的是 data 字段中的内容
    let jsonString = data.data || "[]";
    console.log("🔍 JSON String (first 200 chars):", jsonString.substring(0, 200));
    
    // 处理可能的 Markdown 格式
    if (typeof jsonString === 'string') {
      if (jsonString.includes("```json")) {
        jsonString = jsonString.replace(/```json/g, "").replace(/```/g, "");
      } else if (jsonString.includes("```")) {
        jsonString = jsonString.replace(/```/g, "");
      }
    }
    
    const newsItems = (typeof jsonString === 'string' ? JSON.parse(jsonString.trim()) : jsonString) as NewsItem[];
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
    const token = getAuthToken();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    // Add timestamp parameter to prevent caching and ensure unique images
    const timestamp = Date.now();
    const url = `/api/ai-handler?action=image&headline=${encodeURIComponent(headline)}&timestamp=${timestamp}`;
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: token ? {
        'Authorization': `Bearer ${token}`,
      } : {},
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

    // ai-handler 返回 imageUrl (自动生成的 Pollinations.ai 链接)
    if (data.imageUrl) {
      console.log("✅ Image URL received from ai-handler");
      return data.imageUrl; // 直接返回 URL
    }

    // 备用：处理 base64 响应
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
  const token = getAuthToken();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`/api/ai-handler?action=speech&text=${encodeURIComponent(text)}&voice=${voice}`, {
        method: 'GET',
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : {},
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
