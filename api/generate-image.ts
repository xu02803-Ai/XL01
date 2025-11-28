import { GoogleGenAI } from "@google/genai";

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!key) {
    throw new Error("API key not configured");
  }
  return key;
};

// Extract key terms from headline using Gemini
const extractKeyTerms = async (headline: string, apiKey: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [{ 
          text: `Extract 2-3 key terms from this tech news headline for image search. Return ONLY the terms separated by commas, no explanation.\n\nHeadline: "${headline}"`
        }]
      }]
    } as any);

    const content = response.candidates?.[0]?.content?.parts?.[0] as any;
    if (content && "text" in content) {
      return content.text.trim().split(',')[0].trim(); // Get first term
    }
    return headline.split(' ').slice(0, 2).join(' '); // Fallback
  } catch (e) {
    console.warn("Failed to extract terms, using headline");
    return headline.split(' ').slice(0, 2).join(' ');
  }
};

// Fetch image from Unsplash
const fetchFromUnsplash = async (query: string): Promise<{ url: string; mimeType: string } | null> => {
  try {
    // Using the Unsplash API endpoint that doesn't require authentication for basic queries
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&client_id=YOUR_UNSPLASH_KEY`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      // Fallback: use a placeholder service
      return {
        url: `https://picsum.photos/400/300?random=${Math.random()}`,
        mimeType: 'image/jpeg'
      };
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return {
        url: data.results[0].urls.regular,
        mimeType: 'image/jpeg'
      };
    }

    // Fallback to placeholder
    return {
      url: `https://picsum.photos/400/300?random=${Math.random()}`,
      mimeType: 'image/jpeg'
    };
  } catch (e) {
    console.warn("Unsplash fetch failed, using placeholder");
    return {
      url: `https://picsum.photos/400/300?random=${Math.random()}`,
      mimeType: 'image/jpeg'
    };
  }
};

// Convert URL image to base64
const urlToBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (e) {
    console.warn("Failed to convert URL to base64:", e);
    return null;
  }
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
    const { headline } = req.query;
    
    if (!headline) {
      return res.status(400).json({ error: "Missing headline parameter" });
    }

    const apiKey = getApiKey();
    const decodedHeadline = decodeURIComponent(headline);
    
    console.log("🖼️ Generating image for headline:", decodedHeadline);
    
    // Step 1: Extract key terms from headline
    const searchQuery = await extractKeyTerms(decodedHeadline, apiKey);
    console.log("🔍 Search query:", searchQuery);
    
    // Step 2: Fetch image from Unsplash or placeholder
    const imageData = await fetchFromUnsplash(searchQuery);
    if (!imageData) {
      console.warn("❌ Failed to fetch image");
      return res.status(200).json({ success: false, error: "Could not fetch image" });
    }
    
    console.log("✅ Image URL obtained:", imageData.url);
    
    // Step 3: Convert to base64
    const base64Data = await urlToBase64(imageData.url);
    
    if (base64Data) {
      return res.status(200).json({ 
        success: true, 
        data: base64Data,
        mimeType: imageData.mimeType
      });
    }
    
    // Fallback: return URL directly if base64 conversion fails
    console.warn("⚠️ Base64 conversion failed, returning URL");
    return res.status(200).json({ 
      success: true, 
      data: imageData.url,
      mimeType: imageData.mimeType,
      isUrl: true
    });
    
  } catch (error: any) {
    console.error("❌ Image generation error:", error.message);
    res.status(500).json({ 
      success: false,
      error: error.message || "Internal server error" 
    });
  }
}
