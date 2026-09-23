export function errorHandler(error, _req, res, _next) {
  // TODO: Log the error and include any additional detail in the response payload.
  res.status(error.status || 500).json({ message: error.message || "Unexpected server error" });
}
