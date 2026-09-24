import { ChromaClient } from "chromadb";
import Report from "../models/Report.js";
import { isMemoryMode, memory } from "./inMemoryStore.js";

const chromaPath = process.env.CHROMA_URL || "http://127.0.0.1:8000";
let chromaClient = null;
let isChromaAvailable = null;

function getChromaClient() {
  if (!chromaClient) {
    chromaClient = new ChromaClient({ path: chromaPath });
  }
  return chromaClient;
}

/**
 * Checks ChromaDB availability with a fast timeout.
 */
export async function checkChromaHealth() {
  try {
    const client = getChromaClient();
    await client.heartbeat();
    isChromaAvailable = true;
    return true;
  } catch (error) {
    isChromaAvailable = false;
    return false;
  }
}

/**
 * Persists an agent report into the database (MongoDB or in-memory)
 * and indexes its embedding into ChromaDB if available.
 */
export async function storeReportMemory({ user, project, agentKey, outputFile, content }) {
  const userId = String(user?.id || user?._id || user);
  const projectId = String(project?._id || project?.id || project);
  let embeddingRef = null;

  // 1. Attempt ChromaDB vector insertion
  try {
    const healthy = isChromaAvailable ?? (await checkChromaHealth());
    if (healthy) {
      const client = getChromaClient();
      const collection = await client.getOrCreateCollection({ name: "venture_reports" });
      const docId = `${projectId}_${agentKey}`;
      await collection.upsert({
        ids: [docId],
        documents: [content],
        metadatas: [
          {
            userId,
            projectId,
            agentKey,
            outputFile
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
      embeddingRef
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
 * Searches reports for a user using ChromaDB semantic search or database text match.
 */
export async function searchMemory(userId, query) {
  if (!query || !query.trim()) return [];

  // Try ChromaDB first
  try {
    const healthy = isChromaAvailable ?? (await checkChromaHealth());
    if (healthy) {
      const client = getChromaClient();
      const collection = await client.getOrCreateCollection({ name: "venture_reports" });
      const results = await collection.query({
        queryTexts: [query],
        where: { userId: String(userId) },
        nResults: 10
      });

      if (results?.documents?.[0]?.length) {
        return results.documents[0].map((doc, i) => ({
          content: doc,
          metadata: results.metadatas?.[0]?.[i] || {},
          id: results.ids?.[0]?.[i]
        }));
      }
    }
  } catch (error) {
    console.warn(`[MemoryService] ChromaDB search failed (${error.message}). Falling back to store search.`);
    isChromaAvailable = false;
  }

  // Fallback to active store
  if (isMemoryMode()) {
    return memory.searchReports(userId, query);
  }

  const term = query.trim();
  return Report.find({
    user: userId,
    content: { $regex: term, $options: "i" }
  })
    .sort({ updatedAt: -1 })
    .limit(10);
}
