import jwt from "jsonwebtoken";
import { authService } from "../services/authService.js";

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({
      ok: false,
      message: "Authentication required",
      status: 401
    });
  }


  try {
    const secret = process.env.JWT_SECRET || "replace-me";
    const decoded = jwt.verify(token, secret);

    const user = await authService.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "User not found or session expired",
        status: 401
      });
    }

    req.user = {
      id: user.id || user._id,
      name: user.name,
      email: user.email
    };

    next();
  } catch (_error) {
    return res.status(401).json({
      ok: false,
      message: "Invalid or expired authentication token",
      status: 401
    });
  }
}
