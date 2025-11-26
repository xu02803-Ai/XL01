import { GoogleGenAI, Modality } from "@google/genai";

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
    const { text, voice } = req.query;
    
    if (!text || !voice) {
      return res.status(400).json({ error: "Missing text or voice parameter" });
    }

    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
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
    
    console.log("🎙️ Generating audio with gemini-2.5-flash-preview-tts, voice:", voiceName, "Text length:", decodedText.length);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{
        role: "user",
        parts: [{ text: decodedText }]
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
      console.log("✅ Audio generated successfully with voice:", voiceName);
      return res.status(200).json({ 
        success: true, 
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType || 'audio/mpeg'
      });
    }
    
    console.warn("❌ No audio data in response");
    return res.status(200).json({ success: false, error: "No audio data generated" });
    
  } catch (error: any) {
    console.error("❌ Audio generation error:", error.message);
    res.status(500).json({ 
      success: false,
      error: error.message || "Internal server error" 
    });
  }
}
