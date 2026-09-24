import { search, SafeSearchType } from "duck-duck-scrape";

/**
 * Executes Tavily search when TAVILY_API_KEY is configured.
 */
async function searchTavily(query) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || !apiKey.trim()) return null;

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey.trim(),
        query,
        max_results: 5,
        search_depth: "basic"
      })
    });

    if (!response.ok) {
      console.warn(`[SearchService] Tavily search returned HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data.results || !data.results.length) return "";

    return data.results
      .map((r) => `- **${r.title}**: ${r.content || r.snippet || ""}`)
      .join("\n");
  } catch (error) {
    console.warn(`[SearchService] Tavily search failed (${error.message}). Falling back to DuckDuckGo.`);
    return null;
  }
}

/**
 * Fallback search using DuckDuckGo scraping.
 */
async function searchDuckDuckGo(query) {
  try {
    const res = await search(query, {
      safeSearch: SafeSearchType.STRICT
    });

    if (!res.results || !res.results.length) return "";

    return res.results
      .slice(0, 5)
      .map((r) => `- **${r.title}**: ${r.description || r.snippet || ""}`)
      .join("\n");
  } catch (error) {
    console.warn(`[SearchService] DuckDuckGo search failed (${error.message}). Proceeding without web signals.`);
    return "";
  }
}

/**
 * Searches external market and competitive signals with Tavily -> DuckDuckGo fallback hierarchy.
 * Returns normalized Markdown text or an empty string on complete search failure.
 */
export async function searchMarketSignals(query) {
  if (!query || typeof query !== "string" || !query.trim()) return "";

  return (await searchTavily(query)) ?? (await searchDuckDuckGo(query));
}
