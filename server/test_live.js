import dotenv from "dotenv";
dotenv.config();
import { generateText, getProviderInfo } from "./services/llmService.js";

async function testLive() {
  console.log("Provider Info:", getProviderInfo());
  const res = await generateText("Hello! Please respond with 'Gemini Free Tier Connected Successfully' and nothing else.");
  console.log("Result text:", res.text.trim());
  console.log("Model:", res.model);
  console.log("Tokens:", res.tokenUsage, res.usage);
  console.log("Duration:", res.totalDurationMs, "ms");
}

testLive().catch((err) => {
  console.error("LIVE TEST ERROR:", err.message, err.status);
});
