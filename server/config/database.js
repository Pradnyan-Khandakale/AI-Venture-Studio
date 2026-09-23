import mongoose from "mongoose";
import { seedMemoryStore, setMemoryMode } from "../services/inMemoryStore.js";
import { seedDemoUser } from "../utils/seed.js";

export async function connectDatabase() {
  // TODO: Connect to MONGODB_URI with a short serverSelectionTimeoutMS, leave memory mode
  // TODO: off and seed the demo user on success, and fall back to the in-memory store
  // TODO: (setMemoryMode(true) + seedMemoryStore()) when the connection fails.
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ai-venture-studio";
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 1500 });
    setMemoryMode(false);
    console.log("Connected to MongoDB successfully");
    await seedDemoUser();
  } catch (error) {
    console.warn("MongoDB connection failed, falling back to in-memory store:", error.message);
    setMemoryMode(true);
    await seedMemoryStore();
    console.log("In-memory database store initialized with demo user founder@example.com");
  }
}
