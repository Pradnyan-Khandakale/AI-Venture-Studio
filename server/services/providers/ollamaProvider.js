/**
 * Ollama AI Provider Adapter.
 * Interfaces with a local Ollama instance for local model inference using native fetch.
 */
export async function generate(prompt, options = {}) {
  const baseUrlStr = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
  const model = options.model || process.env.OLLAMA_MODEL || "llama3";
  const numPredict = options.num_predict ?? (process.env.OLLAMA_NUM_PREDICT ? parseInt(process.env.OLLAMA_NUM_PREDICT, 10) : 250);
  const timeoutMs = options.timeoutMs || 600000;

  try {
    const res = await fetch(`${baseUrlStr}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: numPredict
        }
      }),
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Ollama request failed with status ${res.status}: ${body}`);
    }

    const data = await res.json();
    const inputTokens = data.prompt_eval_count || 0;
    const outputTokens = data.eval_count || 0;
    const totalTokens = inputTokens + outputTokens;

    return {
      text: data.response || "",
      tokenUsage: totalTokens > 0 ? totalTokens : null,
      usage: {
        inputTokens: inputTokens > 0 ? inputTokens : null,
        outputTokens: outputTokens > 0 ? outputTokens : null,
        totalTokens: totalTokens > 0 ? totalTokens : null
      },
      model: data.model || model,
      totalDurationMs: data.total_duration ? Math.round(data.total_duration / 1e6) : null
    };
  } catch (error) {
    if (error.name === "TimeoutError") {
      throw new Error(`Ollama request timed out after ${timeoutMs}ms (model: ${model})`);
    }
    const isConnRefused = error.cause?.code === "ECONNREFUSED" || error.code === "ECONNREFUSED" || error.message?.includes("ECONNREFUSED");
    const cleanMessage = isConnRefused
      ? `Failed to connect to Ollama at ${baseUrlStr} (ECONNREFUSED). Please verify Ollama is running and accessible.`
      : error.message?.includes("Ollama") ? error.message : `Ollama generation failed: ${error.message}`;
    throw new Error(cleanMessage);
  }
}
