/**
 * Lightweight, in-memory rate limiter and duplicate action protection.
 * Protects expensive endpoints (PDF generation, email delivery, AI workflows)
 * without requiring external infrastructure like Redis.
 */

class MemoryRateLimiter {
  constructor() {
    this.hits = new Map(); // key -> [timestamps]
    this.inFlight = new Set(); // operation keys currently being processed
  }

  prune(now) {
    for (const [key, timestamps] of this.hits.entries()) {
      const fresh = timestamps.filter((t) => now - t < 10 * 60 * 1000);
      if (fresh.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, fresh);
      }
    }
  }

  /**
   * Express middleware factory for rate limiting and concurrency locking.
   *
   * @param {Object} options
   * @param {number} options.windowMs - Time window in milliseconds (default 60s)
   * @param {number} options.max - Max requests within windowMs (default 20)
   * @param {string} options.operation - Operation name for logging / inFlight check
   * @param {boolean} options.lockInFlight - Whether to prevent simultaneous duplicate requests
   */
  createMiddleware({
    windowMs = 60 * 1000,
    max = 20,
    operation = "request",
    lockInFlight = false
  } = {}) {
    return (req, res, next) => {
      const userId = req.user?.id || req.ip || "anonymous";
      const projectId = req.params?.id || "";
      const clientKey = `${operation}:${userId}`;
      const flightKey = `${operation}:${userId}:${projectId}`;

      // 1. Check in-flight concurrency lock if enabled
      if (lockInFlight && this.inFlight.has(flightKey)) {
        return res.status(429).json({
          ok: false,
          message: `A ${operation} request for this venture is already in progress. Please wait for it to complete.`,
          status: 429
        });
      }

      // 2. Check window rate limit
      const now = Date.now();
      if (this.hits.size > 200) {
        this.prune(now);
      }
      const userTimestamps = this.hits.get(clientKey) || [];
      const windowStart = now - windowMs;
      const recentHits = userTimestamps.filter((t) => t > windowStart);

      if (recentHits.length >= max) {
        const retrySecs = Math.ceil((recentHits[0] + windowMs - now) / 1000);
        res.setHeader("Retry-After", Math.max(1, retrySecs));
        return res.status(429).json({
          ok: false,
          message: `Too many ${operation} requests. Please slow down and try again in ${Math.max(1, retrySecs)} seconds.`,
          status: 429
        });
      }

      // Record hit
      recentHits.push(now);
      this.hits.set(clientKey, recentHits);

      // Acquire flight lock if enabled
      if (lockInFlight) {
        this.inFlight.add(flightKey);
        const release = () => this.inFlight.delete(flightKey);
        res.on("finish", release);
        res.on("close", release);
      }

      next();
    };
  }
}

export const rateLimiter = new MemoryRateLimiter();

// Tailored limiters for expensive Phase 8 endpoints
export const exportRateLimiter = rateLimiter.createMiddleware({
  windowMs: 60 * 1000,
  max: 30, // Up to 30 export requests per minute
  operation: "export",
  lockInFlight: true
});

export const emailRateLimiter = rateLimiter.createMiddleware({
  windowMs: 60 * 1000,
  max: 6, // Up to 6 email dispatches per minute
  operation: "email",
  lockInFlight: true
});

export const aiRunRateLimiter = rateLimiter.createMiddleware({
  windowMs: 60 * 1000,
  max: 15, // Up to 15 AI agent execution triggers per minute
  operation: "ai-execution",
  lockInFlight: false
});

export default rateLimiter;
