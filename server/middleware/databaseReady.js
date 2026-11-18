import { getDatabaseStatus, scheduleDatabaseReconnect } from "../config/database.js";

/**
 * Ensures requests that require database access fail fast with HTTP 503
 * instead of hanging or returning misleading 401 errors when MongoDB is unavailable.
 */
export function requireDatabaseReady(req, res, next) {
  const status = getDatabaseStatus();

  if (status.ready) {
    return next();
  }

  console.warn(
    `[DatabaseGuard] ${req.method} ${req.originalUrl} -> 503 DATABASE_UNAVAILABLE (mode=${status.mode}, state=${status.state}, code=${status.errorCode || "CONNECTING"})`
  );
  scheduleDatabaseReconnect();

  return res.status(503).json({
    ok: false,
    code: "DATABASE_UNAVAILABLE",
    databaseErrorCode: status.errorCode || null,
    message:
      status.publicMessage ||
      "The database is temporarily unavailable. Please try again in a moment.",
    database: status.mode,
    state: status.state,
    status: 503
  });
}

export default requireDatabaseReady;
