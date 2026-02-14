
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
  const token = getAuthToken();
  
  try {
    console.log("🔄 Fetching news from /api/ai-handler...");
    const url = '/api/ai-handler?action=text&dateStr=' + encodeURIComponent(dateStr);
    console.log("📍 Request URL:", url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    console.log("📨 API Response Status:", response.status);
    
    if (!response.ok) {
      let errorText: string;
      try {
        errorText = await response.text();
      } catch {
        errorText = 'Unable to read response body';
      }
      console.error("❌ API Error Response:", errorText.substring(0, 500));
      throw new Error(`API Error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    let data: any;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error("❌ Failed to parse JSON response:", parseError);
      throw new Error('Failed to parse API response - invalid JSON returned');
    }
    
    console.log("📦 Parsed Response:", data);
    
    if (!data.success) {
      console.error("❌ API returned success=false:", data.error);
      throw new Error(data.error || "Failed to fetch news from API");
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
      jsonString = jsonString.trim();
    }
    
    let newsItems: NewsItem[];
    try {
      const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      newsItems = Array.isArray(parsed) ? parsed : [];
    } catch (jsonError) {
      console.error("❌ Failed to parse news JSON:", jsonError);
      console.error("Raw data:", jsonString.substring(0, 500));
      throw new Error('Failed to parse news data - invalid JSON format');
    }
    
    console.log("✅ Successfully parsed news items:", newsItems.length);

    if (!newsItems || newsItems.length === 0) {
      console.warn("⚠️ No news items returned from API");
      // 返回空数组而不是抛出错误
      return {
        news: [],
        groundingMetadata: null,
        date: dateStr
      };
    }

    return {
      news: newsItems,
      groundingMetadata: null,
      date: dateStr
    };

  } catch (error: any) {
    console.error("❌ Error fetching news:", error.message || error);
    throw new Error(error.message || "Failed to fetch news. Please check the console for details.");
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

      // 处理两种格式的返回数据
      let base64Data = data.data;
      
      // 如果返回的是 data:// URL 格式，需要提取实际的 Base64 部分
      if (base64Data.startsWith('data:')) {
        const matches = base64Data.match(/base64,(.+)$/);
        if (matches && matches[1]) {
          base64Data = matches[1];
        } else {
          throw new Error("Invalid data URL format");
        }
      }
      
      console.log(`🔊 Decoding Base64 audio data (length: ${base64Data.length})`);
      
      // Decode Base64 to ArrayBuffer
      try {
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        console.log(`✅ Audio decoded successfully, buffer size: ${bytes.buffer.byteLength} bytes`);
        return bytes.buffer;
      } catch (decodeError) {
        console.error("Base64 decode error:", (decodeError as any).message);
        console.error("Base64 string length:", base64Data.length);
        console.error("First 50 chars:", base64Data.substring(0, 50));
        throw new Error("Failed to decode Base64: " + (decodeError as any).message);
      }

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
