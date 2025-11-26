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
        const decodedHeadline = decodeURIComponent(headline);
        const prompt = `Create a cyberpunk-style image for this news headline: "${decodedHeadline}". High tech, neon colors, futuristic design, no text.`;
        
        console.log("Generating image for:", decodedHeadline);
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [{
            role: "user",
            parts: [{ text: prompt }]
          }]
        } as any);

        const content = response.candidates?.[0]?.content?.parts?.[0];
        
        if (content && "inlineData" in content) {
          console.log("Image generated successfully");
          return res.status(200).json({ 
            success: true, 
            data: content.inlineData.data,
            mimeType: content.inlineData.mimeType
          });
        }
        
        console.warn("No image data in response");
        return res.status(200).json({ success: false, error: "No image data" });
      } catch (e: any) {
        console.error("Image generation failed:", e);
        return res.status(200).json({ success: false, error: e.message });
      }
    }

    // Generate audio
    if (action === 'audio' && text && voice) {
      try {
        const decodedText = decodeURIComponent(text);
        const voiceStr = voice.toLowerCase() === 'male' ? 'Puck' : 'Kore';
        
        console.log("Generating audio with voice:", voiceStr, "for text length:", decodedText.length);
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [{
            role: "user",
            parts: [{ text: decodedText }]
          }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceStr
                }
              }
            }
          }
        } as any);

        const content = response.candidates?.[0]?.content?.parts?.[0];
        
        if (content && "inlineData" in content) {
          console.log("Audio generated successfully with voice:", voiceStr);
          return res.status(200).json({ 
            success: true, 
            data: content.inlineData.data,
            mimeType: content.inlineData.mimeType
          });
        }
        
        console.warn("No audio data in response");
        return res.status(200).json({ success: false, error: "No audio data" });
      } catch (e: any) {
        console.error("Audio generation failed:", e);
        return res.status(200).json({ success: false, error: e.message });
      }
    }

    res.status(400).json({ error: "Invalid action" });
  } catch (error: any) {
    console.error("Media generation error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
}
