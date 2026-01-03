import { callGeminiWithFallback } from "./gemini-utils";

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
    const prompt = `Create a detailed, tech-focused image generation prompt for this tech news. The image should be visually striking, modern, and directly related to the content. Use vibrant colors, NOT dark colors.\n\nNews headline: "${headline}"\n\nReturn a single, detailed prompt (max 150 words) optimized for AI image generation. Focus on: bright and vibrant visual style, tech elements, composition, professional lighting, and mood. Make it specific to the news topic. IMPORTANT: Use bright colors and good lighting, avoid dark images.`;
    
    const result = await callGeminiWithFallback(apiKey, prompt, {
      model: "gemini-2.5-flash",
      maxTokens: 256,
    });

    if (result.success && result.content) {
      return result.content.trim();
    }
    return `Modern bright technology news illustration about ${headline}, professional, tech aesthetic, digital art, vibrant colors, well-lit, futuristic, high quality`;
  } catch (e) {
    console.warn("Failed to generate image prompt, using default");
    return `Modern bright technology news illustration about ${headline}, professional, tech aesthetic, digital art, vibrant colors, well-lit, futuristic, high quality`;
  }
};

// Try Gemini image generation first (using vision capability with text)
// If not available, fall back to Unsplash
const tryGeminiImageGeneration = async (prompt: string, apiKey: string): Promise<string | null> => {
  try {
    console.log("🤖 Attempting Gemini-powered image generation...");
    
    // Note: Gemini 2.5 Flash currently doesn't have native image generation
    // But we can use it to enhance the prompt for Unsplash
    return null; // Skip for now, use enhanced Unsplash instead
  } catch (e) {
    console.warn("Gemini image generation not available, falling back to Unsplash");
    return null;
  }
};

// Extract key terms from headline for search query fallback
const extractKeyTerms = async (headline: string, apiKey: string): Promise<string> => {
  try {
    const prompt = `Extract 2-3 key terms from this tech news headline for image search. Return ONLY the terms separated by commas, no explanation.\n\nHeadline: "${headline}"`;
    
    const result = await callGeminiWithFallback(apiKey, prompt, {
      model: "gemini-2.5-flash",
      maxTokens: 50,
    });

    if (result.success && result.content) {
      return result.content.trim().split(',')[0].trim();
    }
    return headline.split(' ').slice(0, 2).join(' '); // Fallback
  } catch (e) {
    console.warn("Failed to extract terms, using headline");
    return headline.split(' ').slice(0, 2).join(' ');
  }
};

// Fetch image from high-quality sources with better caching control
const fetchImage = async (query: string, headline: string, randomSeed: string): Promise<{ url: string; mimeType: string } | null> => {
  try {
    // High-quality tech/innovation images that are consistently available
    // Using direct Unsplash image IDs to avoid API key issues
    const techImages = [
      { query: 'ai', urls: ['https://images.unsplash.com/photo-1677442d019cecf3e5a2b393f68b649eb51b12d6f', 'https://images.unsplash.com/photo-1620825892179-6d4dae56b95b'] },
      { query: 'cloud', urls: ['https://images.unsplash.com/photo-1519389950473-47ba0277781c', 'https://images.unsplash.com/photo-1526374965328-7f5ae4e8cfb2'] },
      { query: 'tech', urls: ['https://images.unsplash.com/photo-1517694712202-14dd9538aa97', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71'] },
      { query: 'innovation', urls: ['https://images.unsplash.com/photo-1451187580459-43490279c0fa', 'https://images.unsplash.com/photo-1550355291-bbee04a92027'] },
      { query: 'digital', urls: ['https://images.unsplash.com/photo-1536384816338-efea798d13cb', 'https://images.unsplash.com/photo-1485827404703-0a5588e9c90f'] },
      { query: 'business', urls: ['https://images.unsplash.com/photo-1552664730-d307ca884978', 'https://images.unsplash.com/photo-1552664730-d307ca884978'] },
      { query: 'startup', urls: ['https://images.unsplash.com/photo-1519389950473-47ba0277781c', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40'] },
      { query: 'data', urls: ['https://images.unsplash.com/photo-1551288049-bebda4e38f71', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d'] },
    ];

    // Select image based on query matching and random seed
    let selectedImages: string[] = [];
    const queryLower = query.toLowerCase();
    
    // Try to find matching category
    for (const category of techImages) {
      if (queryLower.includes(category.query)) {
        selectedImages = category.urls;
        break;
      }
    }
    
    // Fallback to random category if no match
    if (selectedImages.length === 0) {
      const randomCategoryIndex = parseInt(randomSeed.substring(0, 2), 16) % techImages.length;
      selectedImages = techImages[randomCategoryIndex].urls;
    }
    
    // Select specific image from category based on seed
    const imageIndex = parseInt(randomSeed.substring(2, 4), 16) % selectedImages.length;
    let baseUrl = selectedImages[imageIndex];
    
    // Add quality parameters
    const params = [
      'w=800',
      'h=600',
      'fit=crop',
      'q=85', // High quality
      'auto=format', // Auto format optimization
      `ixlib=rb-4.0.3`,
      `mark-align=top%2Cleft`,
    ];
    
    const separator = baseUrl.includes('?') ? '&' : '?';
    const finalUrl = `${baseUrl}${separator}${params.join('&')}&t=${randomSeed}`;
    
    console.log(`✅ Selected image for query: "${query}" (seed: ${randomSeed.substring(0, 6)}...)`);
    
    return {
      url: finalUrl,
      mimeType: 'image/jpeg'
    };
  } catch (e) {
    console.warn("Image fetch failed:", e);
    return {
      url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=600&fit=crop&q=85&auto=format',
      mimeType: 'image/jpeg'
    };
  }
};

// Convert URL image to base64 with better error handling
const urlToBase64 = async (url: string): Promise<string | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn(`Failed to fetch image, status: ${response.status}`);
      return null;
    }
    
    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('image')) {
      console.warn(`Invalid content type: ${contentType}`);
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    
    // Check if buffer is valid
    if (!buffer || buffer.byteLength === 0) {
      console.warn("Empty buffer received");
      return null;
    }
    
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    const base64Data = btoa(binary);
    
    // Validate base64
    if (!base64Data || base64Data.length < 100) {
      console.warn("Suspicious base64 data, likely corrupted or placeholder");
      return null;
    }
    
    return base64Data;
  } catch (e: any) {
    if (e.name === 'AbortError') {
      console.warn("Base64 conversion timeout");
    } else {
      console.warn("Failed to convert URL to base64:", e.message);
    }
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
    
    // Step 3: Fetch image with direct CDN URLs (avoids API issues)
    const imageData = await fetchImage(searchQuery, decodedHeadline, randomSeed);
    if (!imageData) {
      console.warn("❌ Failed to fetch image");
      return res.status(200).json({ success: false, error: "Could not fetch image" });
    }
    
    console.log("✅ Image URL obtained:", imageData.url.substring(0, 80) + "...");
    
    // Step 4: Try base64 conversion, but always return URL as fallback
    // This prevents black/corrupted images from being returned
    console.log("📦 Attempting base64 conversion...");
    const base64Data = await urlToBase64(imageData.url);
    
    if (base64Data && base64Data.length > 500) {
      // Only return base64 if it's substantial and likely valid
      console.log("✅ Base64 conversion successful");
      return res.status(200).json({ 
        success: true, 
        data: base64Data,
        mimeType: imageData.mimeType,
        prompt: imagePrompt,
        seed: randomSeed,
        cached: false
      });
    }
    
    // Always prefer returning URL over corrupted base64
    console.warn("⚠️ Base64 conversion failed or data invalid, returning URL directly");
    return res.status(200).json({ 
      success: true, 
      data: imageData.url,
      mimeType: imageData.mimeType,
      isUrl: true,
      prompt: imagePrompt,
      seed: randomSeed,
      cached: false
    });
    
  } catch (error: any) {
    console.error("❌ Image generation error:", error.message);
    res.status(500).json({ 
      success: false,
      error: error.message || "Internal server error" 
    });
  }
}
