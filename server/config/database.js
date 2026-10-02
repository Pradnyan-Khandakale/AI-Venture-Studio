import mongoose from "mongoose";
import { seedMemoryStore, setMemoryMode } from "../services/inMemoryStore.js";
import { seedDemoUser } from "../utils/seed.js";

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const isProduction = process.env.NODE_ENV === "production";
  const uri = process.env.MONGODB_URI || (isProduction ? "" : "mongodb://127.0.0.1:27017/ai-venture-studio");

  if (isProduction && (!uri || uri.includes("127.0.0.1") || uri.includes("localhost"))) {
    const errorMsg = "[Database] CRITICAL: MONGODB_URI must be set to a valid remote MongoDB Atlas connection string in production.";
    console.error(errorMsg);
    if (process.env.ALLOW_IN_MEMORY_PRODUCTION !== "true") {
      throw new Error(errorMsg);
    }
  }

  // Setup connection event listeners
  mongoose.connection.on("error", (err) => {
    if (isProduction) {
      console.error("[Database] MongoDB connection error:", err.message);
    }
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[Database] MongoDB connection disconnected.");
  });

  const timeoutMs = isProduction ? 10000 : 3000;

  try {
    await mongoose.connect(uri || "mongodb://127.0.0.1:27017/ai-venture-studio", {
      serverSelectionTimeoutMS: timeoutMs
    });
    setMemoryMode(false);
    console.log(`[Database] Connected to MongoDB successfully. Mode: mongodb (${isProduction ? "Production/Atlas" : "Local"})`);
    await seedDemoUser();
    return mongoose.connection;
  } catch (error) {
    if (isProduction && process.env.ALLOW_IN_MEMORY_PRODUCTION !== "true") {
      console.error(`[Database] CRITICAL: Failed to connect to MongoDB Atlas (${error.message}).`);
      console.error("[Database] Ensure your MONGODB_URI is correct and MongoDB Atlas Network Access allows 0.0.0.0/0 (all IPs) for Render.");
      throw error;
    }

    setMemoryMode(true);
    await mongoose.disconnect().catch(() => {});
    console.warn(`[Database] MongoDB connection failed (${error.message}). Activating in-memory development mode fallback.`);
    console.log("[Database] Mode: in-memory fallback (development mode)");
    await seedMemoryStore();
    return null;
  }
}


