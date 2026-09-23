import mongoose from "mongoose";

// TODO: Define the fields: name (default "Founder"), email (unique, lowercase), passwordHash.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, default: "Founder" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
