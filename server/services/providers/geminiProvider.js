/**
 * Google Gemini AI Provider Adapter.
 * Uses official @google/genai SDK for Gemini API free-tier inference.
 * Features rate-limit detection, bounded exponential backoff, token tracking, and structured error reporting.
 */
import { GoogleGenAI } from "@google/genai";
import { setTimeout as sleep } from "node:timers/promises";

/**
 * Determines whether an error represents a rate limit / quota exhaustion event.
 */
function isRateLimitError(error) {
  if (!error) return false;
  const status = error.status || error.statusCode || error.code;
  if (status === 429) return true;

  const msg = String(error.message || "").toLowerCase();
  return (
    msg.includes("resource_exhausted") ||
    msg.includes("429") ||
    msg.includes("quota exceeded") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests")
  );
}

/**
 * Determines whether an error represents an authentication / invalid API key error.
 */
function isAuthError(error) {
  if (!error) return false;
  const status = error.status || error.statusCode || error.code;
  const msg = String(error.message || "").toLowerCase();

  return (
    status === 401 ||
    status === 403 ||
    msg.includes("api_key_invalid") ||
    msg.includes("api key not valid") ||
    msg.includes("permission_denied") ||
    msg.includes("unregistered callers")
  );
}

/**
 * Determines whether an error represents a temporary server outage / demand spike (503, 502, 504).
 */
function isTransientServerError(error) {
  if (!error) return false;
  const status = error.status || error.statusCode || error.code;
  if (status === 503 || status === 502 || status === 504) return true;

  const msg = String(error.message || "").toLowerCase();
  const causeCode = String(error.cause?.code || "").toLowerCase();
  return (
    msg.includes("503") ||
    msg.includes("unavailable") ||
    msg.includes("high demand") ||
    msg.includes("overloaded") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("fetch failed") ||
    msg.includes("enotfound") ||
    msg.includes("network") ||
    msg.includes("eai_again") ||
    causeCode.includes("enotfound") ||
    causeCode.includes("econnreset")
  );
}

/**
 * Extracts human-readable message from JSON error payload if applicable.
 */
function extractCleanMessage(error) {
  if (!error) return "Gemini generation failed";
  const raw = error.message || "";
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
  } catch {
    // raw string
  }
  return raw;
}

/**
 * Extracts a suggested retry-after delay (in ms) from error messages or headers, if available.
 */
function extractRetryAfterMs(error) {
  try {
    const msg = error.message || "";
    const match = msg.match(/retry after (\d+)/i) || msg.match(/wait (\d+)\s*s/i);
    if (match && match[1]) {
      const seconds = parseInt(match[1], 10);
      if (!isNaN(seconds) && seconds > 0 && seconds <= 30) {
        return seconds * 1000;
      }
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
}

/**
 * Generates text using Google Gemini API with controlled rate-limit retries.
 *
 * @param {string} prompt - Prompt content
 * @param {object} options - Generation options (model, maxOutputTokens, temperature, etc.)
 * @returns {Promise<{ text: string, tokenUsage: number|null, usage: object, model: string, totalDurationMs: number }>}
 */
export async function generate(prompt, options = {}) {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey && !options._simulateAuthError && !options._simulateRateLimit && process.env.SIMULATE_GEMINI_RATE_LIMIT !== "true") {
    const err = new Error("Gemini API key is not configured. Please set GEMINI_API_KEY in server/.env.");
    err.status = 401;
    err.code = "GEMINI_KEY_MISSING";
    throw err;
  }

  // Model selection (options.model overrides env, falling back to GEMINI_MODEL or default)
  const model = options.model || process.env.GEMINI_MODEL || "gemini-3.7-flash";

  // Output token limit
  const maxOutputTokens =
    process.env.GEMINI_MAX_OUTPUT_TOKENS
      ? parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS, 10)
      : options.maxOutputTokens || 3500;

  // Temperature
  const temperature = options.temperature ?? 0.7;

  // Thinking / Latency settings
  const rawBudget = options.thinkingBudget ?? process.env.GEMINI_THINKING_BUDGET;
  const thinkingBudget = rawBudget !== undefined ? Number(rawBudget) : undefined;

  // Retry policy configuration (bounded exponential backoff)
  const maxRetries = options.maxRetries ?? (process.env.GEMINI_MAX_RETRIES ? parseInt(process.env.GEMINI_MAX_RETRIES, 10) : 2);
  const baseDelayMs = options.baseDelayMs ?? (process.env.GEMINI_RETRY_DELAY_MS ? parseInt(process.env.GEMINI_RETRY_DELAY_MS, 10) : 2000);
  const maxAttempts = maxRetries + 1;

  const totalStartTime = Date.now();
  let attempt = 0;
  let lastError = null;

  while (attempt < maxAttempts) {
    attempt++;

    try {
      if (options._simulateRateLimit || process.env.SIMULATE_GEMINI_RATE_LIMIT === "true") {
        throw Object.assign(new Error("429 RESOURCE_EXHAUSTED: Free tier quota reached for model"), { status: 429 });
      }
      if (options._simulateAuthError) {
        throw Object.assign(new Error("API_KEY_INVALID: API key not valid"), { status: 400 });
      }

      const client = new GoogleGenAI({ apiKey });

      const config = {
        maxOutputTokens,
        temperature
      };

      if (thinkingBudget !== undefined && !isNaN(thinkingBudget)) {
        config.thinkingConfig = { thinkingBudget };
      }

      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config
      });

      const text = response?.text || "";
      if (!text.trim()) {
        throw new Error("Gemini returned an empty response. Please verify prompt or retry.");
      }

      const usage = response?.usageMetadata || {};
      const inputTokens = usage.promptTokenCount ?? null;
      const outputTokens = usage.candidatesTokenCount ?? null;
      const totalTokens = usage.totalTokenCount ?? (inputTokens && outputTokens ? inputTokens + outputTokens : null);
      const totalDurationMs = Date.now() - totalStartTime;

      return {
        text,
        tokenUsage: totalTokens > 0 ? totalTokens : null,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens
        },
        model,
        totalDurationMs
      };
    } catch (error) {
      lastError = error;

      // Check for Authentication / Key Invalid error (do NOT retry auth failures)
      if (isAuthError(error)) {
        const cleanAuthError = new Error("Gemini API authentication failed. Check GEMINI_API_KEY in server/.env.");
        cleanAuthError.status = 401;
        cleanAuthError.code = "GEMINI_AUTH_FAILED";
        throw cleanAuthError;
      }

      // Check for Rate Limit / Quota Exhaustion
      if (isRateLimitError(error)) {
        if (attempt < maxAttempts) {
          const suggestedRetry = extractRetryAfterMs(error);
          const jitter = Math.floor(Math.random() * 500);
          const delayMs = suggestedRetry || baseDelayMs * Math.pow(2, attempt - 1) + jitter;

          console.warn(
            `[GeminiProvider] Rate limit encountered (attempt ${attempt}/${maxAttempts}). Retrying in ${delayMs}ms...`
          );
          await sleep(delayMs);
          continue;
        }

        // Bounded retries exhausted: throw structured rate limit error
        const cleanRateError = new Error(
          "Gemini API free-tier quota/rate limit reached (429 RESOURCE_EXHAUSTED). Please wait before retrying."
        );
        cleanRateError.status = 429;
        cleanRateError.code = "RESOURCE_EXHAUSTED";
        throw cleanRateError;
      }

      // Check for transient server errors (503 high demand, 502/504 gateway, network resets)
      if (isTransientServerError(error)) {
        if (attempt < maxAttempts) {
          const jitter = Math.floor(Math.random() * 500);
          const delayMs = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
          console.warn(
            `[GeminiProvider] Transient server error encountered (${extractCleanMessage(error)}). Retrying in ${delayMs}ms...`
          );
          await sleep(delayMs);
          continue;
        }

        const clean503Error = new Error(
          "Gemini service is currently experiencing temporary high demand (503 UNAVAILABLE). Please wait a moment before retrying."
        );
        clean503Error.status = 503;
        clean503Error.code = "UNAVAILABLE";
        throw clean503Error;
      }

      // Non-retryable error
      break;
    }
  }

  // Final structured error rethrow
  const finalMsg = extractCleanMessage(lastError);
  const err = new Error(finalMsg);
  err.status = lastError?.status || 500;
  err.code = lastError?.code || "GEMINI_GENERATION_FAILED";
  throw err;
}
