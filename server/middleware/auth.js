import jwt from "jsonwebtoken";
import { authService } from "../services/authService.js";

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({
      ok: false,
      code: "AUTH_REQUIRED",
      message: "Authentication required",
      status: 401
    });
  }

  let decoded;
  try {
    const secret = process.env.JWT_SECRET || "replace-me";
    decoded = jwt.verify(token, secret);
  } catch (error) {
    const isExpired = error?.name === "TokenExpiredError";
    return res.status(401).json({
      ok: false,
      code: isExpired ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
      message: isExpired ? "Your session has expired. Please sign in again." : "Invalid or expired authentication token",
      status: 401
    });
  }

  if (!decoded?.id) {
    return res.status(401).json({
      ok: false,
      code: "TOKEN_INVALID",
      message: "Invalid authentication token payload",
      status: 401
    });
  }

  try {
    const user = await authService.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        ok: false,
        code: "SESSION_INVALID",
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
  } catch (error) {
    // Malformed ObjectId (e.g., stale in-memory token against MongoDB) is an invalid token
    if (error?.name === "CastError") {
      return res.status(401).json({
        ok: false,
        code: "TOKEN_INVALID",
        message: "Invalid or expired authentication token",
        status: 401
      });
    }

    // Never masquerade transient database errors as 401 Unauthorized (which would log out valid users)
    console.error("[Auth Middleware] Database error while verifying session:", error?.message || error);
    return res.status(503).json({
      ok: false,
      code: "DATABASE_UNAVAILABLE",
      message: "Unable to verify session because the database is temporarily unavailable. Please try again.",
      status: 503
    });
  }
}
