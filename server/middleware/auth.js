import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { isMemoryMode, memory } from "../services/inMemoryStore.js";

export async function requireAuth(req, res, next) {
  // TODO: Read the Bearer token, reject with 401 when it is missing or invalid, verify it,
  // TODO: load the user from the memory store or MongoDB, and set req.user.
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "replace-me");
    let user = null;
    if (isMemoryMode()) {
      user = memory.findUserById(decoded.id);
    } else {
      user = await User.findById(decoded.id).select("-passwordHash");
    }

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
