import bcrypt from "bcryptjs";
import User from "../models/User.js";

export async function seedDemoUser() {
  // TODO: Create the founder@example.com demo user with a hashed password when it does
  // TODO: not already exist.
  try {
    const existing = await User.findOne({ email: "founder@example.com" });
    if (!existing) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash("password123", salt);
      await User.create({
        name: "Founder",
        email: "founder@example.com",
        passwordHash
      });
      console.log("Demo user founder@example.com seeded successfully in MongoDB");
    }
  } catch (error) {
    console.warn("Could not seed demo user in MongoDB:", error.message);
  }
}
