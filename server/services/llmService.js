/**
 * LLM Service for AI Venture Studio.
 * Interfaces with local Ollama instance for free, local model inference.
 */

export async function generateWithOllama(prompt, options = {}) {
  const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
  const model = process.env.OLLAMA_MODEL || options.model || "llama3";
  const timeoutMs = options.timeoutMs || 45000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.num_predict ?? 2048
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Ollama request failed with status ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    const tokenUsage = (data.prompt_eval_count || 0) + (data.eval_count || 0);

    return {
      text: data.response || "",
      tokenUsage: tokenUsage > 0 ? tokenUsage : null,
      model: data.model || model,
      totalDurationMs: data.total_duration ? Math.round(data.total_duration / 1e6) : null
    };
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Ollama request timed out after ${timeoutMs}ms (model: ${model})`);
    }
    // Re-throw with clear message without leaking credentials
    const isConnRefused =
      error.cause?.code === "ECONNREFUSED" ||
      error.message?.includes("ECONNREFUSED") ||
      error.message === "fetch failed";
    const cleanMessage = isConnRefused
      ? `Failed to connect to Ollama at ${baseUrl} (ECONNREFUSED). Please verify Ollama is running and accessible.`
      : error.message || "Ollama generation failed";
    throw new Error(cleanMessage);
  } finally {
    clearTimeout(timeoutId);
  }
}
