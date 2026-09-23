export function errorHandler(error, req, res, _next) {
  const status = error.status || error.statusCode || 500;
  const message = error.message || "Internal server error";

  // Provide useful development diagnostics through server-side logging
  console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, error.message || error);

  res.status(status).json({
    ok: false,
    message,
    status
  });
}

