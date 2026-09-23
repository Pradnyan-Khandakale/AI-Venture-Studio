import mongoose from "mongoose";

// TODO: Define the fields: user, project, agentKey, outputFile, content, embeddingRef.
const reportSchema = new mongoose.Schema({}, { timestamps: true });

export default mongoose.model("Report", reportSchema);
