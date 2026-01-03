import { GoogleGenAI, Modality } from "@google/genai";
import { getModelStats } from "./gemini-utils";

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!key) {
    throw new Error("API key not configured");
  }
  return key;
};

// Call TTS models with automatic fallback
async function callTTSWithFallback(
  apiKey: string,
  text: string,
  voiceName: string
): Promise<{ success: boolean; data?: string; mimeType?: string; model?: string; error?: string }> {
  // Models to try in order (primary to fallback)
  const models = [
    'gemini-2.5-flash-preview-tts',  // Primary - latest TTS
    'gemini-1.5-pro',                 // Fallback - stable
  ];

  let lastError = "";

  for (const modelId of models) {
    try {
      console.log(`🎙️ Attempting TTS with model: ${modelId}, voice: ${voiceName}`);
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: modelId,
        contents: [{
          role: "user",
          parts: [{ text }]
        }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName
              }
            }
          }
        }
      } as any);

      const part = response.candidates?.[0]?.content?.parts?.[0];
      
      if (part && "inlineData" in part && part.inlineData) {
        console.log(`✅ TTS success with model ${modelId}`);
        return {
          success: true,
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'audio/mpeg',
          model: modelId
        };
      }

      lastError = "No audio data in response";
      console.warn(`⚠️ Model ${modelId} returned no audio data, trying next...`);
      
    } catch (error: any) {
      lastError = error.message || String(error);
      console.warn(`⚠️ TTS model ${modelId} failed:`, lastError);
      
      // Check if it's a quota error
      if (
        lastError.includes("RESOURCE_EXHAUSTED") ||
        lastError.includes("quota") ||
        lastError.includes("429") ||
        lastError.includes("rate limit")
      ) {
        console.warn(`🔄 Quota exceeded for ${modelId}, trying fallback...`);
        continue;
      }
      
      // Try next model anyway
      continue;
    }
  }

  return {
    success: false,
    error: `All TTS models failed. Last error: ${lastError}`,
  };
}

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
    const decodedText = decodeURIComponent(text);
    
    // Map voice parameter to valid voice names
    const voiceMap: { [key: string]: string } = {
      'male': 'Puck',
      'Male': 'Puck',
      'MALE': 'Puck',
      'female': 'Kore',
      'Female': 'Kore',
      'FEMALE': 'Kore'
    };
    
    const voiceName = voiceMap[voice] || 'Kore';
    
    console.log("🎙️ Calling TTS API with fallback support, voice:", voiceName, "Text length:", decodedText.length);
    
    const result = await callTTSWithFallback(apiKey, decodedText, voiceName);

    if (result.success) {
      return res.status(200).json({ 
        success: true, 
        data: result.data,
        mimeType: result.mimeType,
        model: result.model
      });
    }
    
    console.warn("❌ No audio data in response");
    return res.status(200).json({ 
      success: false, 
      error: result.error,
      modelStats: getModelStats()
    });
    
  } catch (error: any) {
    console.error("❌ Audio generation error:", error.message);
    res.status(500).json({ 
      success: false,
      error: error.message || "Internal server error" 
    });
  }
}
