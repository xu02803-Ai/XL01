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

  const { action, headline, text, voice } = req.query;

  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    // Generate image
    if (action === 'image' && headline) {
      try {
        const prompt = `Cyberpunk concept art: "${decodeURIComponent(headline)}". High tech, neon, cinematic lighting. No text.`;
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-preview',
          contents: [{
            role: "user",
            parts: [{ text: prompt }]
          }]
        } as any);

        const content = response.candidates?.[0]?.content?.parts?.[0];
        if (content && "text" in content) {
          return res.status(200).json({ success: true, data: content.text });
        }
        return res.status(500).json({ error: "No image response" });
      } catch (e: any) {
        console.error("Image generation failed:", e);
        return res.status(500).json({ success: false, error: e.message });
      }
    }

    // Generate audio
    if (action === 'audio' && text && voice) {
      try {
        const voiceName = voice === 'Male' ? 'Puck' : 'Kore';
        const decodedText = decodeURIComponent(text);
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-preview',
          contents: [{
            role: "user",
            parts: [{ text: `Generate audio in ${voiceName} voice for: ${decodedText}` }]
          }]
        } as any);

        const content = response.candidates?.[0]?.content?.parts?.[0];
        if (content && "inlineData" in content) {
          const audioData = content.inlineData;
          return res.status(200).json({ 
            success: true, 
            data: audioData.data,
            mimeType: audioData.mimeType
          });
        }
        return res.status(500).json({ error: "No audio response" });
      } catch (e: any) {
        console.error("Audio generation failed:", e);
        return res.status(500).json({ success: false, error: e.message });
      }
    }

    res.status(400).json({ error: "Invalid action" });
  } catch (error: any) {
    console.error("Media generation error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
}
