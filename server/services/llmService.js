/**
 * LLM Service for AI Venture Studio.
 * Interfaces with local Ollama instance for free, local model inference.
 */
import http from "node:http";
import https from "node:https";

export async function generateWithOllama(prompt, options = {}) {
  const baseUrlStr = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
  const model = process.env.OLLAMA_MODEL || options.model || "llama3";
  const numPredict = options.num_predict ?? (process.env.OLLAMA_NUM_PREDICT ? parseInt(process.env.OLLAMA_NUM_PREDICT, 10) : 250);
  const timeoutMs = options.timeoutMs || 600000;

  const url = new URL(`${baseUrlStr}/api/generate`);
  const isHttps = url.protocol === "https:";
  const client = isHttps ? https : http;

  const payload = JSON.stringify({
    model,
    prompt,
    stream: false,
    options: {
      temperature: options.temperature ?? 0.7,
      num_predict: numPredict
    }
  });

  return new Promise((resolve, reject) => {
    let timedOut = false;
    let timer = null;

    const req = client.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload)
        }
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          clearTimeout(timer);
          if (timedOut) return;
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`Ollama request failed with status ${res.statusCode}: ${body}`));
          }
          try {
            const data = JSON.parse(body);
            const tokenUsage = (data.prompt_eval_count || 0) + (data.eval_count || 0);
            resolve({
              text: data.response || "",
              tokenUsage: tokenUsage > 0 ? tokenUsage : null,
              model: data.model || model,
              totalDurationMs: data.total_duration ? Math.round(data.total_duration / 1e6) : null
            });
          } catch (parseErr) {
            reject(new Error(`Failed to parse Ollama JSON response: ${parseErr.message}`));
          }
        });
      }
    );

    timer = setTimeout(() => {
      timedOut = true;
      req.destroy();
      reject(new Error(`Ollama request timed out after ${timeoutMs}ms (model: ${model})`));
    }, timeoutMs);

    req.on("error", (error) => {
      clearTimeout(timer);
      if (timedOut) return;
      const isConnRefused = error.code === "ECONNREFUSED" || error.message?.includes("ECONNREFUSED");
      const cleanMessage = isConnRefused
        ? `Failed to connect to Ollama at ${baseUrlStr} (ECONNREFUSED). Please verify Ollama is running and accessible.`
        : error.message || "Ollama generation failed";
      reject(new Error(cleanMessage));
    });

    req.write(payload);
    req.end();
  });
}

