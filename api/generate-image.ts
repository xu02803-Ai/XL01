import { GoogleGenAI } from "@google/genai";

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!key) {
    throw new Error("API key not configured");
  }
  return key;
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
    const ai = new GoogleGenAI({ apiKey });
    const decodedHeadline = decodeURIComponent(headline);
    
    const prompt = `Create a cyberpunk-style image for this tech news headline: "${decodedHeadline}". High tech, neon colors, futuristic design, no text.`;
    
    console.log("🖼️ Generating image with gemini-2.5-flash for:", decodedHeadline);
    
    // Set timeout for image generation (15 seconds)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Image generation timeout after 15 seconds")), 15000)
    );
    
    const generationPromise = ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }]
    } as any);

    const response = await Promise.race([generationPromise, timeoutPromise]) as any;
    
    const part = response.candidates?.[0]?.content?.parts?.[0];
    
    if (part && "inlineData" in part && part.inlineData) {
      console.log("✅ Image generated successfully");
      return res.status(200).json({ 
        success: true, 
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType || 'image/png'
      });
    }
    
    console.warn("❌ No image data in response");
    return res.status(200).json({ success: false, error: "No image data generated" });
    
  } catch (error: any) {
    console.error("❌ Image generation error:", error.message);
    res.status(500).json({ 
      success: false,
      error: error.message || "Internal server error" 
    });
  }
}
