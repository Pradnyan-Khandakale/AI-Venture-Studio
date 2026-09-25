import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      enum: ["Founder", "CEO", "CTO", "CFO", "CMO", "VC", "Consensus"]
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const boardroomSessionSchema = new mongoose.Schema(
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
    title: {
      type: String,
      default: "Executive Board Session"
    },
    question: {
      type: String,
      required: true
    },
    messages: [messageSchema],
    consensus: {
      type: String,
      default: ""
    },
    tokenUsage: {
      type: Number,
      default: 0
    },
    runtimeMs: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

export default mongoose.models.BoardroomSession || mongoose.model("BoardroomSession", boardroomSessionSchema);

