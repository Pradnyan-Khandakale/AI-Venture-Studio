import mongoose from "mongoose";
import { seedMemoryStore, setMemoryMode } from "../services/inMemoryStore.js";
import { seedDemoUser } from "../utils/seed.js";

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ai-venture-studio";
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    setMemoryMode(false);
    console.log("[Database] Connected to MongoDB successfully. Mode: mongodb");
    await seedDemoUser();
  } catch (error) {
    setMemoryMode(true);
    console.warn(`[Database] MongoDB connection failed (${error.message}). Activating in-memory development mode fallback.`);
    console.log("[Database] Mode: in-memory fallback (development mode)");
    await seedMemoryStore();
  }
}


