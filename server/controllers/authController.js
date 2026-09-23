import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { isMemoryMode, memory } from "../services/inMemoryStore.js";
import { signToken } from "../utils/authToken.js";

function authResponse(user) {
  // TODO: Return the signed token plus the safe user fields (id, name, email).
  const token = signToken(user);
  return {
    token,
    user: {
      id: user._id || user.id,
      name: user.name,
      email: user.email
    }
  };
}

export async function register(req, res) {
  // TODO: Reject duplicate emails with 409, hash the password, create the user in the
  // TODO: memory store or MongoDB, and respond with 201 and the auth payload.
  try {
    const { name, email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (isMemoryMode()) {
      const existing = memory.findUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "User already exists with this email" });
      }
      const user = await memory.createUser({ name, email, password });
      return res.status(201).json(authResponse(user));
    } else {
      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        return res.status(409).json({ message: "User already exists with this email" });
      }
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const user = await User.create({
        name: name || "Founder",
        email: email.toLowerCase().trim(),
        passwordHash
      });
      return res.status(201).json(authResponse(user));
    }
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to register" });
  }
}

export async function login(req, res) {
  // TODO: Look up the user, compare the password with bcrypt, and respond with the auth
  // TODO: payload or 401 for invalid credentials.
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    let user = null;
    if (isMemoryMode()) {
      user = memory.findUserByEmail(email);
    } else {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    return res.json(authResponse(user));
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to login" });
  }
}
