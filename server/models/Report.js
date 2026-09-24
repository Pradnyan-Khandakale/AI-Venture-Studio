import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true
    },
    agentKey: {
      type: String,
      required: true,
      index: true
    },
    outputFile: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    embeddingRef: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

reportSchema.index({ project: 1, agentKey: 1 }, { unique: true });

export default mongoose.model("Report", reportSchema);
