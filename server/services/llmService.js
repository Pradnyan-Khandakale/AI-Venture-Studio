export async function generateWithOllama(prompt, options = {}) {
  // TODO: POST the prompt to the local Ollama /api/generate endpoint with the configured
  // TODO: model, num_predict, and temperature, abort it after the timeout, and return the
  // TODO: response text or null when the call fails.
  return null;
}

export function buildFallbackReport(project, agent) {
  // TODO: Build the offline Markdown report from the project context and the agent
  // TODO: responsibilities, with recommendations and a note about configuring Ollama.
  return "";
}
