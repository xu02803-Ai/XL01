import { GoogleGenAI } from "@google/genai";

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!key) {
    throw new Error("API key not configured");
  }
  return key;
};

// Generate an optimized tech-focused prompt from headline
const generateImagePrompt = async (headline: string, apiKey: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [{ 
          text: `Create a detailed, tech-focused image generation prompt for this tech news. The image should be visually striking, modern, and directly related to the content.\n\nNews headline: "${headline}"\n\nReturn a single, detailed prompt (max 150 words) optimized for AI image generation. Focus on: visual style, tech elements, composition, lighting, and mood. Make it specific to the news topic.`
        }]
      }]
    } as any);

    const content = response.candidates?.[0]?.content?.parts?.[0] as any;
    if (content && "text" in content) {
      return content.text.trim();
    }
    return `Modern technology news illustration about ${headline}, professional, tech aesthetic, digital art, vibrant colors, futuristic`;
  } catch (e) {
    console.warn("Failed to generate image prompt, using default");
    return `Modern technology news illustration about ${headline}, professional, tech aesthetic, digital art, vibrant colors, futuristic`;
  }
};

// Extract key terms from headline for search query fallback
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

// Fetch image from Unsplash with tech-focused search and randomization
const fetchFromUnsplash = async (query: string, headline: string, randomSeed: string): Promise<{ url: string; mimeType: string } | null> => {
  try {
    // Try primary search query with enhanced variety
    let searchQueries = [
      `${query} technology`, // Original query + tech
      `${query} digital`, // With digital context
      `${query} innovation`, // With innovation context
      `technology innovation news`, // Generic fallback
      'tech news modern', // Generic tech aesthetic
      'artificial intelligence', // Tech industry focus
      'digital transformation', // Tech focus
      'cloud computing technology', // Tech infrastructure
    ];

    for (const searchQuery of searchQueries) {
      try {
        // Add random sort and pagination for variety
        const page = Math.floor(Math.random() * 5) + 1; // Random page 1-5
        const perPage = Math.floor(Math.random() * 3) + 3; // 3-5 results
        
        const response = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=${perPage}&page=${page}&order_by=relevant&client_id=YOUR_UNSPLASH_KEY`,
          { headers: { Accept: 'application/json' } }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            // Always pick a random one from results for maximum variety
            const randomIndex = Math.floor(Math.random() * data.results.length);
            const imageUrl = data.results[randomIndex].urls.regular;
            
            // Add query params to bypass any browser/CDN caching
            const cacheBreaker = `&t=${randomSeed}&v=${Date.now()}`;
            const finalUrl = imageUrl.includes('?') 
              ? `${imageUrl}${cacheBreaker}`
              : `${imageUrl}?${cacheBreaker}`;
            
            console.log(`✅ Found image for query: "${searchQuery}" (page ${page}, index ${randomIndex})`);
            return {
              url: finalUrl,
              mimeType: 'image/jpeg'
            };
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch for query: "${searchQuery}"`);
        continue;
      }
    }

    // Fallback: use a high-quality tech-themed placeholder with dynamic parameters
    const fallbackImages = [
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1550355291-bbee04a92027?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1536384816338-efea798d13cb?w=800&h=600&fit=crop',
    ];
    
    const fallbackIndex = parseInt(randomSeed.substring(0, 8), 16) % fallbackImages.length;
    const selectedFallback = fallbackImages[fallbackIndex];
    
    console.log(`Using fallback image ${fallbackIndex + 1}/5: ${selectedFallback}`);
    
    return {
      url: `${selectedFallback}&t=${randomSeed}`,
      mimeType: 'image/jpeg'
    };
  } catch (e) {
    console.warn("Unsplash fetch failed, using tech-themed placeholder");
    return {
      url: `https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=600&fit=crop&t=${randomSeed}`,
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
  
  // Prevent caching to ensure fresh images each time
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { headline, timestamp } = req.query;
    
    if (!headline) {
      return res.status(400).json({ error: "Missing headline parameter" });
    }

    const apiKey = getApiKey();
    const decodedHeadline = decodeURIComponent(headline);
    
    // Generate unique random seed based on timestamp, random value, and headline
    // This ensures each request gets a different image even for the same headline
    const randomSeed = `${Date.now()}-${Math.random().toString(36).substring(2)}-${Math.random().toString(36).substring(2)}`;
    
    console.log("🖼️ Generating tech-focused image for headline:", decodedHeadline);
    console.log("🎲 Random seed:", randomSeed);
    
    // Step 1: Generate tech-focused image prompt
    console.log("📝 Generating optimized image prompt...");
    const imagePrompt = await generateImagePrompt(decodedHeadline, apiKey);
    console.log("📝 Image prompt:", imagePrompt.substring(0, 100) + "...");
    
    // Step 2: Extract key terms for search fallback
    const searchQuery = await extractKeyTerms(decodedHeadline, apiKey);
    console.log("🔍 Search query:", searchQuery);
    
    // Step 3: Fetch image from Unsplash with enhanced search and randomization
    const imageData = await fetchFromUnsplash(searchQuery, decodedHeadline, randomSeed);
    if (!imageData) {
      console.warn("❌ Failed to fetch image");
      return res.status(200).json({ success: false, error: "Could not fetch image" });
    }
    
    console.log("✅ Image URL obtained:", imageData.url.substring(0, 80) + "...");
    
    // Step 4: Convert to base64 (optional, for inline display)
    const base64Data = await urlToBase64(imageData.url);
    
    if (base64Data) {
      return res.status(200).json({ 
        success: true, 
        data: base64Data,
        mimeType: imageData.mimeType,
        prompt: imagePrompt,
        seed: randomSeed // Return seed for debugging
      });
    }
    
    // Fallback: return URL directly if base64 conversion fails
    console.warn("⚠️ Base64 conversion failed, returning URL");
    return res.status(200).json({ 
      success: true, 
      data: imageData.url,
      mimeType: imageData.mimeType,
      isUrl: true,
      prompt: imagePrompt,
      seed: randomSeed // Return seed for debugging
    });
    
  } catch (error: any) {
    console.error("❌ Image generation error:", error.message);
    res.status(500).json({ 
      success: false,
      error: error.message || "Internal server error" 
    });
  }
}
