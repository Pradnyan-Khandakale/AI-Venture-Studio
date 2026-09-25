/**
 * Unified LLM Service for AI Venture Studio.
 * Routes AI generation requests through an AI Provider Adapter layer.
 * Supported providers:
 *   - "gemini": Google Gemini API free-tier via @google/genai SDK (default)
 *   - "ollama": Local Ollama instance
 */
import * as geminiProvider from "./providers/geminiProvider.js";
import * as ollamaProvider from "./providers/ollamaProvider.js";

/**
 * Returns the currently active AI provider name ("gemini" or "ollama").
 */
export function getActiveProvider() {
  return (process.env.AI_PROVIDER || "gemini").toLowerCase().trim();
}

/**
 * Returns public metadata about the configured AI provider.
 */
export function getProviderInfo() {
  const provider = getActiveProvider();
  if (provider === "gemini") {
    return {
      provider: "gemini",
      model: process.env.GEMINI_MODEL || "gemini-3.7-flash",
      isConfigured: Boolean(process.env.GEMINI_API_KEY)
    };
  }
  if (provider === "ollama") {
    return {
      provider: "ollama",
      model: process.env.OLLAMA_MODEL || "llama3",
      baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434"
    };
  }
  return { provider, isConfigured: false };
}

/**
 * Core generation interface used across the AI Venture Engine pipeline.
 * Routes to the configured provider adapter.
 *
 * @param {string} prompt - Prompt content
 * @param {object} options - Options passed to provider
 * @returns {Promise<{ text: string, tokenUsage: number|null, usage: object, model: string, totalDurationMs: number }>}
 */
export async function generateText(prompt, options = {}) {
  const provider = getActiveProvider();

  if (provider === "gemini") {
    return geminiProvider.generate(prompt, options);
  }

  if (provider === "ollama") {
    return ollamaProvider.generate(prompt, options);
  }

  throw new Error(
    `Unsupported AI_PROVIDER "${provider}". Supported providers are "gemini" and "ollama".`
  );
}

export const llmService = {
  generateText,
  getActiveProvider,
  getProviderInfo
};

export default llmService;

