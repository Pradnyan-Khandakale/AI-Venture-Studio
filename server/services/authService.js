import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { isMemoryMode, memory } from "./inMemoryStore.js";
import { signToken } from "../utils/authToken.js";

export const authService = {
  async findUserByEmail(email) {
    const normalized = (email || "").toLowerCase().trim();
    if (isMemoryMode()) {
      return memory.findUserByEmail(normalized);
    }
    return User.findOne({ email: normalized });
  },

  async findUserById(id) {
    if (isMemoryMode()) {
      const u = memory.findUserById(id);
      return u ? { id: u.id || u._id, name: u.name, email: u.email } : null;
    }
    const u = await User.findById(id).select("-passwordHash");
    return u ? { id: u._id.toString(), name: u.name, email: u.email } : null;
  },

  async registerUser({ name, email, password }) {
    const normalized = (email || "").toLowerCase().trim();
    const existing = await this.findUserByEmail(normalized);
    if (existing) {
      const error = new Error("User already exists with this email");
      error.status = 409;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let user;
    if (isMemoryMode()) {
      user = await memory.createUser({
        name: name || "Founder",
        email: normalized,
        passwordHash
      });
    } else {
      user = await User.create({
        name: name || "Founder",
        email: normalized,
        passwordHash
      });
    }

    const token = signToken(user);
    return {
      token,
      user: {
        id: user._id?.toString() || user.id,
        name: user.name,
        email: user.email
      }
    };
  },

  async loginUser({ email, password }) {
    const normalized = (email || "").toLowerCase().trim();
    const user = await this.findUserByEmail(normalized);
    if (!user) {
      const error = new Error("Invalid email or password");
      error.status = 401;
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const error = new Error("Invalid email or password");
      error.status = 401;
      throw error;
    }

    const token = signToken(user);
    return {
      token,
      user: {
        id: user._id?.toString() || user.id,
        name: user.name,
        email: user.email
      }
    };
  }
};
