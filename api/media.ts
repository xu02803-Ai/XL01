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

    // Generate image with gemini-2.5-flash-image
    if (action === 'image' && headline) {
      try {
        const decodedHeadline = decodeURIComponent(headline);
        const prompt = `Create a cyberpunk-style image for this tech news headline: "${decodedHeadline}". High tech, neon colors, futuristic design, no text.`;
        
        console.log("Generating image with gemini-2.5-flash-image for:", decodedHeadline);
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: [{
            role: "user",
            parts: [{ text: prompt }]
          }]
        } as any);

        const part = response.candidates?.[0]?.content?.parts?.[0];
        
        if (part && "inlineData" in part && part.inlineData) {
          console.log("✓ Image generated successfully");
          return res.status(200).json({ 
            success: true, 
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png'
          });
        }
        
        console.warn("✗ No image data in response");
        return res.status(200).json({ success: false, error: "No image data generated" });
        
      } catch (e: any) {
        console.error("✗ Image generation error:", e.message);
        return res.status(200).json({ 
          success: false, 
          error: `Image failed: ${e.message}` 
        });
      }
    }

    // Generate audio with gemini-2.5-flash-preview-tts
    if (action === 'audio' && text && voice) {
      try {
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
        
        console.log("Generating audio with gemini-2.5-flash-preview-tts, voice:", voiceName, "Text length:", decodedText.length);
        
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
          console.log("✓ Audio generated successfully with voice:", voiceName);
          return res.status(200).json({ 
            success: true, 
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'audio/mpeg'
          });
        }
        
        console.warn("✗ No audio data in response");
        return res.status(200).json({ success: false, error: "No audio data generated" });
        
      } catch (e: any) {
        console.error("✗ Audio generation error:", e.message);
        return res.status(200).json({ 
          success: false, 
          error: `Audio failed: ${e.message}` 
        });
      }
    }

    res.status(400).json({ error: "Invalid action or missing parameters" });
    
  } catch (error: any) {
    console.error("✗ Media handler error:", error.message);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
}
