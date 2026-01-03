import { GoogleGenAI } from "@google/genai";

export interface GeminiCallConfig {
  model?: string;
  text?: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

// Models in priority order (primary to fallback)
const MODEL_PRIORITY = [
  "gemini-2.5-flash",      // Primary - latest, fastest
  "gemini-1.5-flash",      // Fallback - stable, reliable
  "gemini-1.5-pro-exp-0514", // Last resort - powerful but slower
];

// Model statistics for monitoring
interface ModelStats {
  model: string;
  successCount: number;
  errorCount: number;
  lastError?: string;
  lastErrorTime?: Date;
  disabled: boolean;
}

const modelStats: Map<string, ModelStats> = new Map(
  MODEL_PRIORITY.map(model => [
    model,
    {
      model,
      successCount: 0,
      errorCount: 0,
      disabled: false,
    }
  ])
);

/**
 * Call Gemini API with automatic fallback to lower models if quota exceeded
 * @param apiKey - Google API key
 * @param prompt - The prompt text
 * @param config - Additional configuration (model, system prompt, etc)
 * @returns The generated content
 */
export async function callGeminiWithFallback(
  apiKey: string,
  prompt: string,
  config: GeminiCallConfig = {}
): Promise<{ success: boolean; content?: string; model?: string; error?: string }> {
  const {
    model: preferredModel,
    systemPrompt,
    maxTokens = 4096,
    temperature = 0.7,
    topP = 0.9,
  } = config;

  // Determine models to try
  let modelsToTry = MODEL_PRIORITY.filter(m => !modelStats.get(m)?.disabled);
  
  if (preferredModel && modelsToTry.includes(preferredModel)) {
    // Put preferred model first
    modelsToTry = [
      preferredModel,
      ...modelsToTry.filter(m => m !== preferredModel)
    ];
  }

  let lastError: string = "";

  for (const modelId of modelsToTry) {
    try {
      console.log(`🤖 Attempting API call with model: ${modelId}`);
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: modelId,
        contents: [{
          role: "user",
          parts: systemPrompt 
            ? [
                { text: systemPrompt },
                { text: prompt }
              ]
            : [{ text: prompt }]
        }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
          topP,
        }
      } as any);

      const content = response.candidates?.[0]?.content?.parts?.[0] as any;
      
      if (!content || !("text" in content)) {
        throw new Error("No text content in response");
      }

      // Success - update stats
      const stats = modelStats.get(modelId)!;
      stats.successCount++;
      stats.errorCount = 0; // Reset error count on success

      console.log(`✅ Success with model ${modelId} (${stats.successCount} successes)`);
      
      return {
        success: true,
        content: content.text.trim(),
        model: modelId,
      };

    } catch (error: any) {
      lastError = error.message || String(error);
      const stats = modelStats.get(modelId)!;
      stats.errorCount++;
      stats.lastError = lastError;
      stats.lastErrorTime = new Date();

      console.warn(`⚠️ Model ${modelId} failed:`, lastError);
      
      // Check if this is a quota error
      if (
        lastError.includes("RESOURCE_EXHAUSTED") ||
        lastError.includes("quota") ||
        lastError.includes("exceeded") ||
        lastError.includes("429") ||
        lastError.includes("rate limit")
      ) {
        console.warn(`🔄 Quota exceeded for ${modelId}, trying next model...`);
        // Continue to next model
        continue;
      }

      // For other errors, also try fallback
      console.warn(`⚠️ Error with ${modelId}, trying fallback model...`);
      continue;
    }
  }

  // All models exhausted
  console.error("❌ All Gemini models failed. Model statistics:", {
    models: Array.from(modelStats.entries()).map(([model, stats]) => ({
      model,
      successes: stats.successCount,
      errors: stats.errorCount,
      lastError: stats.lastError,
      disabled: stats.disabled,
    }))
  });

  return {
    success: false,
    error: `All models failed. Last error: ${lastError}`,
  };
}

/**
 * Get current model statistics and health
 */
export function getModelStats() {
  return Array.from(modelStats.entries()).map(([model, stats]) => ({
    model,
    successCount: stats.successCount,
    errorCount: stats.errorCount,
    successRate: stats.successCount + stats.errorCount > 0
      ? ((stats.successCount / (stats.successCount + stats.errorCount)) * 100).toFixed(2) + "%"
      : "N/A",
    lastError: stats.lastError,
    lastErrorTime: stats.lastErrorTime,
    disabled: stats.disabled,
  }));
}

/**
 * Manually disable a model
 */
export function disableModel(modelId: string) {
  const stats = modelStats.get(modelId);
  if (stats) {
    stats.disabled = true;
    console.log(`🔴 Model ${modelId} manually disabled`);
  }
}

/**
 * Manually enable a model
 */
export function enableModel(modelId: string) {
  const stats = modelStats.get(modelId);
  if (stats) {
    stats.disabled = false;
    stats.errorCount = 0; // Reset error count
    console.log(`🟢 Model ${modelId} manually enabled`);
  }
}

/**
 * Reset statistics for all models
 */
export function resetModelStats() {
  modelStats.forEach(stats => {
    stats.successCount = 0;
    stats.errorCount = 0;
    stats.disabled = false;
    stats.lastError = undefined;
    stats.lastErrorTime = undefined;
  });
  console.log("🔄 Model statistics reset");
}
