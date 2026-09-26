import { ChromaClient } from "chromadb";
import Report from "../models/Report.js";
import Project from "../models/Project.js";
import { isMemoryMode, memory } from "./inMemoryStore.js";
import { projectService } from "./projectService.js";

const chromaPath = process.env.CHROMA_URL || "http://127.0.0.1:8000";
let chromaClient = null;
let isChromaAvailable = null;
let lastChromaCheckTime = 0;
const CHROMA_HEALTH_CACHE_MS = 30000; // 30-second health cache

const getChromaClient = () => (chromaClient ??= new ChromaClient({ path: chromaPath }));

/**
 * Checks ChromaDB availability with a bounded fast timeout (1200ms).
 * Caches positive or negative response to avoid blocking recurring queries.
 */
export async function checkChromaHealth() {
  const now = Date.now();
  if (isChromaAvailable !== null && now - lastChromaCheckTime < CHROMA_HEALTH_CACHE_MS) {
    return isChromaAvailable;
  }

  try {
    const client = getChromaClient();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("ChromaDB heartbeat timeout")), 1200)
    );
    await Promise.race([client.heartbeat(), timeoutPromise]);
    isChromaAvailable = true;
  } catch (error) {
    isChromaAvailable = false;
  }

  lastChromaCheckTime = now;
  return isChromaAvailable;
}

/**
 * Splits report content into semantic chunks by markdown headings or length.
 */
export function chunkReport(content, maxChunkLength = 1200) {
  if (!content || typeof content !== "string") return [];

  // Split on markdown headers (H1, H2, H3)
  const sections = content.split(/(?=\n#{1,3}\s+)/);
  const chunks = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    // Extract section heading if present
    const headerMatch = trimmed.match(/^#{1,3}\s+(.+)$/m);
    const heading = headerMatch ? headerMatch[1].trim() : "";

    if (trimmed.length <= maxChunkLength) {
      chunks.push({ title: heading, text: trimmed });
    } else {
      // Split large sections by paragraphs
      const paragraphs = trimmed.split(/\n\s*\n/);
      let buffer = "";
      for (const p of paragraphs) {
        if (buffer.length + p.length > maxChunkLength && buffer.length > 0) {
          chunks.push({ title: heading, text: buffer.trim() });
          buffer = p;
        } else {
          buffer = buffer ? `${buffer}\n\n${p}` : p;
        }
      }
      if (buffer.trim()) {
        chunks.push({ title: heading, text: buffer.trim() });
      }
    }
  }

  return chunks.length > 0 ? chunks : [{ title: "Overview", text: content.trim() }];
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "with",
  "by", "about", "as", "into", "like", "through", "after", "over", "between",
  "out", "against", "during", "without", "before", "under", "around", "among",
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "can", "could", "will", "would", "should", "of",
  "find", "show", "what", "which", "where", "how", "previous", "historical", "related", "similar"
]);

function tokenizeQuery(query) {
  return (query || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function extractSnippet(text, queryTerms, maxLength = 260) {
  if (!text) return "";
  const lower = text.toLowerCase();
  let bestIdx = -1;

  for (const term of queryTerms) {
    const idx = lower.indexOf(term.toLowerCase());
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
      bestIdx = idx;
    }
  }

  if (bestIdx === -1) {
    const clean = text.replace(/\s+/g, " ").trim();
    return clean.slice(0, maxLength) + (clean.length > maxLength ? "..." : "");
  }

  const start = Math.max(0, bestIdx - 60);
  const end = Math.min(text.length, bestIdx + maxLength - 60);
  let snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  return snippet;
}

function calculateRelevanceScore({ text, title, startupName, industry, targetUsers, query, queryTerms }) {
  const lowerText = (text || "").toLowerCase();
  const lowerTitle = (title || "").toLowerCase();
  const lowerStartup = (startupName || "").toLowerCase();
  const lowerIndustry = (industry || "").toLowerCase();
  const lowerTargetUsers = (targetUsers || "").toLowerCase();
  const lowerQuery = query.toLowerCase().trim();

  let score = 0;

  // 1. Exact full query phrase match
  if (lowerQuery.length > 3 && lowerText.includes(lowerQuery)) {
    score += 65;
  }
  if (lowerQuery.length > 3 && (lowerStartup.includes(lowerQuery) || lowerIndustry.includes(lowerQuery) || lowerTargetUsers.includes(lowerQuery))) {
    score += 85;
  }

  // 2. Token overlap & keyword frequency
  let matchedTermsCount = 0;
  for (const term of queryTerms) {
    let termFound = false;

    if (lowerStartup.includes(term)) {
      score += 40;
      termFound = true;
    }
    if (lowerIndustry.includes(term)) {
      score += 35;
      termFound = true;
    }
    if (lowerTargetUsers.includes(term)) {
      score += 35;
      termFound = true;
    }
    if (lowerTitle.includes(term)) {
      score += 25;
      termFound = true;
    }

    try {
      const occurrences = (lowerText.match(new RegExp(`\\b${escapeRegExp(term)}\\b`, "gi")) || []).length;
      if (occurrences > 0) {
        score += Math.min(30, 8 + Math.round(Math.log2(occurrences + 1) * 6));
        termFound = true;
      } else if (lowerText.includes(term)) {
        score += 5;
        termFound = true;
      }
    } catch (_err) {
      if (lowerText.includes(term)) {
        score += 5;
        termFound = true;
      }
    }

    if (termFound) matchedTermsCount++;
  }

  if (matchedTermsCount === 0) {
    return 0;
  }

  // Full query term coverage bonus
  if (queryTerms.length > 0 && matchedTermsCount === queryTerms.length) {
    score += 30;
  }

  return Number((Math.min(99, Math.max(15, Math.round(score))) / 100).toFixed(2));
}

/**
 * Indexes or updates a startup project brief in memory.
 */
export async function indexProjectMemory(project, user) {
  const userId = String(user?.id || user?._id || user);
  const projectId = String(project?._id || project?.id || project);

  const startupName = project.startupName || "Startup";
  const idea = project.idea || "";
  const industry = project.industry || "";
  const targetUsers = project.targetUsers || "";
  const country = project.country || "United States";
  const budget = project.budget || "";
  const timeline = project.timeline || "";

  const briefContent = `${startupName}: ${idea}\nIndustry: ${industry}\nTarget Users: ${targetUsers}\nCountry: ${country}\nBudget: ${budget}\nTimeline: ${timeline}`;

  try {
    const healthy = isChromaAvailable ?? (await checkChromaHealth());
    if (healthy) {
      const client = getChromaClient();
      const collection = await client.getOrCreateCollection({ name: "venture_reports" });
      const docId = `${projectId}_brief`;
      await collection.upsert({
        ids: [docId],
        documents: [briefContent],
        metadatas: [
          {
            userId,
            projectId,
            agentKey: "project_brief",
            outputFile: "project_brief.md",
            startupName,
            industry,
            country
          }
        ]
      });
    }
  } catch (chromaError) {
    console.warn(`[MemoryService] ChromaDB brief indexing skipped (${chromaError.message}).`);
    isChromaAvailable = false;
  }

  return { projectId, indexed: true };
}

/**
 * Persists an agent report into the database (MongoDB or in-memory)
 * and indexes its chunks into ChromaDB if available.
 * Avoids duplicate indexing via deterministic document IDs.
 */
export async function storeReportMemory(params = {}) {
  const { user, userId: uid, project, projectId: pid, agentKey, outputFile, content } = params;
  const userId = String(user?.id || user?._id || user || uid || "");
  const projectId = String(project?._id || project?.id || project || pid || "");

  // Extract or fetch project details for rich metadata indexing
  let startupName = project?.startupName || "";
  let industry = project?.industry || "";
  let country = project?.country || "";

  if (!startupName) {
    try {
      const p = await projectService.getProjectForUser(projectId, userId);
      if (p) {
        startupName = p.startupName || "";
        industry = p.industry || "";
        country = p.country || "";
      }
    } catch (_e) {
      // Non-critical metadata lookup
    }
  }

  let embeddingRef = null;
  const docId = `${projectId}_${agentKey}`;

  // 1. Attempt ChromaDB vector insertion with deterministic ID
  try {
    const healthy = isChromaAvailable ?? (await checkChromaHealth());
    if (healthy) {
      const client = getChromaClient();
      const collection = await client.getOrCreateCollection({ name: "venture_reports" });
      await collection.upsert({
        ids: [docId],
        documents: [content],
        metadatas: [
          {
            userId,
            projectId,
            agentKey,
            outputFile,
            startupName,
            industry,
            country,
            createdAt: new Date().toISOString()
          }
        ]
      });
      embeddingRef = docId;
    }
  } catch (chromaError) {
    console.warn(`[MemoryService] ChromaDB vector indexing skipped (${chromaError.message}).`);
    isChromaAvailable = false;
  }

  // 2. Persist in database (MongoDB or in-memory fallback)
  if (isMemoryMode()) {
    memory.upsertReport({
      user: userId,
      project: projectId,
      agentKey,
      outputFile,
      content,
      embeddingRef,
      startupName,
      industry,
      country
    });
    return { user: userId, project: projectId, agentKey, outputFile, content, embeddingRef };
  }

  const savedReport = await Report.findOneAndUpdate(
    { project: projectId, agentKey },
    {
      $set: {
        user: userId,
        project: projectId,
        agentKey,
        outputFile,
        content,
        embeddingRef
      }
    },
    { upsert: true, new: true, runValidators: true }
  );

  return savedReport;
}

/**
 * Searches reports and project knowledge for an authenticated user.
 * Supports ChromaDB semantic search when available with automatic fallback
 * to a relevance-scored multi-source engine.
 *
 * @param {string} userId - Authenticated user ID (strictly enforced)
 * @param {string} query - Search term
 * @param {object} options - { projectId, agentKey, limit }
 */
export async function searchMemory(userId, query, options = {}) {
  const uid = String(userId || "");
  if (!uid || !query || !query.trim()) return [];

  const cleanQuery = query.trim();
  const queryTerms = tokenizeQuery(cleanQuery);
  const limit = Math.max(1, Math.min(50, options.limit || 10));
  const filterProjectId = options.projectId ? String(options.projectId) : null;
  const filterAgentKey = options.agentKey ? String(options.agentKey) : null;

  // 1. Try ChromaDB if available
  try {
    const healthy = isChromaAvailable ?? (await checkChromaHealth());
    if (healthy) {
      const client = getChromaClient();
      const collection = await client.getOrCreateCollection({ name: "venture_reports" });

      const whereFilter = { userId: uid };
      if (filterProjectId) {
        whereFilter.projectId = filterProjectId;
      }
      if (filterAgentKey) {
        whereFilter.agentKey = filterAgentKey;
      }

      const results = await collection.query({
        queryTexts: [cleanQuery],
        where: whereFilter,
        nResults: limit
      });

      if (results?.documents?.[0]?.length) {
        return results.documents[0].map((doc, i) => {
          const meta = results.metadatas?.[0]?.[i] || {};
          const dist = results.distances?.[0]?.[i];
          // Cosine similarity or distance mapping
          const score = typeof dist === "number" ? Math.max(0.1, Number((1 - dist / 2).toFixed(2))) : 0.85;
          return {
            id: results.ids?.[0]?.[i] || `${meta.projectId}_${meta.agentKey}`,
            projectId: meta.projectId,
            startupName: meta.startupName || "Venture",
            industry: meta.industry || "",
            country: meta.country || "",
            agentKey: meta.agentKey || "report",
            outputFile: meta.outputFile || `${meta.agentKey}.md`,
            title: meta.agentKey ? meta.agentKey.toUpperCase() : "Deliverable",
            relevantText: extractSnippet(doc, queryTerms),
            score,
            createdAt: meta.createdAt || new Date().toISOString(),
            matchType: "semantic_vector"
          };
        });
      }
    }
  } catch (error) {
    console.warn(`[MemoryService] ChromaDB search skipped (${error.message}). Falling back to relevance search.`);
    isChromaAvailable = false;
  }

  // 2. High-performance Relevance-Scored Fallback Engine
  // Retrieve user's authorized projects and reports
  let userProjects = [];
  let userReports = [];

  if (isMemoryMode()) {
    userProjects = memory.listProjects(uid);
    userReports = memory.reports.filter((r) => String(r.user) === uid);
  } else {
    userProjects = await Project.find({ user: uid }).lean();
    userReports = await Report.find({ user: uid }).lean();
  }

  // Build lookup map for projects
  const projectMap = new Map(userProjects.map((p) => [String(p._id || p.id), p]));

  // Also include project agentRuns reports if Report collection was empty or in-memory
  const candidates = [];

  // A. Index Project Briefs
  for (const p of userProjects) {
    const pid = String(p._id || p.id);
    if (filterProjectId && pid !== filterProjectId) continue;
    if (filterAgentKey && filterAgentKey !== "project_brief") continue;

    const briefText = `${p.startupName}. ${p.idea}. Target Users: ${p.targetUsers}. Industry: ${p.industry}. Country: ${p.country || "Global"}. Budget: ${p.budget || ""}. Timeline: ${p.timeline || ""}.`;

    const score = calculateRelevanceScore({
      text: briefText,
      title: "Venture Brief",
      startupName: p.startupName,
      industry: p.industry,
      targetUsers: p.targetUsers,
      query: cleanQuery,
      queryTerms
    });

    if (score > 0) {
      candidates.push({
        id: `${pid}_brief`,
        projectId: pid,
        startupName: p.startupName,
        industry: p.industry,
        country: p.country || "Global",
        agentKey: "project_brief",
        outputFile: "project_brief.md",
        title: "Venture Concept & Brief",
        relevantText: extractSnippet(briefText, queryTerms),
        score,
        createdAt: p.createdAt || p.updatedAt || new Date().toISOString(),
        matchType: "relevance_scored"
      });
    }
  }

  // B. Index Deliverable Reports & Completed Agent Runs
  const reportItems = userReports.map((r) => ({
    pid: String(r.project),
    agentKey: r.agentKey,
    outputFile: r.outputFile,
    content: r.content,
    updatedAt: r.updatedAt || r.createdAt
  }));

  const processedReportKeys = new Set(reportItems.map((r) => `${r.pid}_${r.agentKey}`));

  for (const p of userProjects) {
    const pid = String(p._id || p.id);
    for (const run of p.agentRuns || []) {
      if (run.status === "completed" && run.report && !processedReportKeys.has(`${pid}_${run.key}`)) {
        reportItems.push({
          pid,
          agentKey: run.key,
          outputFile: run.outputFile,
          content: run.report,
          updatedAt: p.updatedAt || p.createdAt
        });
      }
    }
  }

  for (const r of reportItems) {
    if (filterProjectId && r.pid !== filterProjectId) continue;
    if (filterAgentKey && r.agentKey !== filterAgentKey) continue;

    const project = projectMap.get(r.pid);
    const startupName = project?.startupName || "Venture";
    const industry = project?.industry || "";
    const targetUsers = project?.targetUsers || "";

    const chunks = chunkReport(r.content || "");
    let bestChunk = null;
    let bestChunkScore = 0;

    for (const chunk of chunks) {
      const chunkScore = calculateRelevanceScore({
        text: chunk.text,
        title: chunk.title || r.outputFile,
        startupName,
        industry,
        targetUsers,
        query: cleanQuery,
        queryTerms
      });

      if (chunkScore > bestChunkScore) {
        bestChunkScore = chunkScore;
        bestChunk = chunk;
      }
    }

    if (bestChunkScore > 0 && bestChunk) {
      candidates.push({
        id: `${r.pid}_${r.agentKey}`,
        projectId: r.pid,
        startupName,
        industry,
        country: project?.country || "Global",
        agentKey: r.agentKey,
        outputFile: r.outputFile,
        title: bestChunk.title || r.outputFile.replace(".md", "").toUpperCase(),
        relevantText: extractSnippet(bestChunk.text, queryTerms),
        score: bestChunkScore,
        createdAt: r.updatedAt || new Date().toISOString(),
        matchType: "relevance_scored"
      });
    }
  }

  // Sort descending by score, then by recency
  candidates.sort((a, b) => b.score - a.score || new Date(b.createdAt) - new Date(a.createdAt));

  return candidates.slice(0, limit);
}

/**
 * Reusable RAG context retriever for LLM pipelines and Boardroom debates.
 * Formats top relevant historical knowledge into a structured prompt excerpt.
 *
 * @param {object} params - { userId, query, projectId, limit, minScore }
 * @returns {Promise<{ context: string, items: Array }>}
 */
export async function retrieveRelevantContext({ userId, query, projectId, limit = 3, minScore = 0.25 }) {
  if (!query || !query.trim()) {
    return { context: "", items: [] };
  }

  const results = await searchMemory(userId, query, { projectId, limit });
  const qualifying = results.filter((r) => (r.score || 0) >= minScore);

  if (qualifying.length === 0) {
    return { context: "", items: [] };
  }

  const parts = ["--- HISTORICAL VENTURE KNOWLEDGE BASE (RAG CONTEXT) ---"];
  for (let i = 0; i < qualifying.length; i++) {
    const item = qualifying[i];
    parts.push(
      `[Memory ${i + 1}] Venture: "${item.startupName}" | Deliverable: ${item.title} (${item.outputFile})\nSnippet: "${item.relevantText}"`
    );
  }
  parts.push("---------------------------------------------------------");

  return {
    context: parts.join("\n\n"),
    items: qualifying
  };
}

