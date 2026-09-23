import mongoose from "mongoose";

// TODO: Define the message fields: role, content.
const messageSchema = new mongoose.Schema({}, { _id: false });

// TODO: Define the fields: user, project, question, messages, consensus.
const boardroomSessionSchema = new mongoose.Schema({}, { timestamps: true });

export default mongoose.model("BoardroomSession", boardroomSessionSchema);
