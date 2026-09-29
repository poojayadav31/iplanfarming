const DATABASE_CONNECTION_ERROR_CODES = new Set([
  "P1001",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
]);

const isDatabaseConnectionError = (err) => {
  if (!err) {
    return false;
  }

  if (DATABASE_CONNECTION_ERROR_CODES.has(err.code)) {
    return true;
  }

  if (err.name === "PrismaClientInitializationError") {
    return true;
  }

  return /can't reach database server|getaddrinfo|connection.+(?:refused|timed out)/i.test(
    err.message || ""
  );
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;
  const isDevelopment = process.env.NODE_ENV !== "production";

  // 4xx operational errors (expected business-logic rejections) are debug-level noise.
  // Only log 5xx and unexpected errors at ERROR level.
  if (statusCode >= 500 || !isOperational) {
    console.error(`[ERROR] ${err.message}`, {
      statusCode,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
    });
  } else {
    console.debug(`[${statusCode}] ${err.message} — ${req.method} ${req.originalUrl}`);
  }

  // Prisma unique constraint violation
  if (err.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "A record with this value already exists",
    });
  }

  if (err.code === "P2003") {
    return res.status(400).json({
      success: false,
      message: "This record references related data that does not exist",
      ...(isDevelopment ? { details: err.message, code: err.code } : {}),
    });
  }

  if (err.code === "P2021") {
    return res.status(500).json({
      success: false,
      message: "The required database table was not found",
      ...(isDevelopment ? { details: err.message, code: err.code } : {}),
    });
  }

  if (err.code === "P2022") {
    return res.status(500).json({
      success: false,
      message: "The required database column was not found",
      ...(isDevelopment ? { details: err.message, code: err.code } : {}),
    });
  }

  if (isDatabaseConnectionError(err)) {
    return res.status(503).json({
      success: false,
      message:
        "Database connection unavailable. Check your database server and try again.",
      ...(isDevelopment ? { details: err.message, code: err.code } : {}),
    });
  }

  // Zod validation errors (fallback if thrown outside validate middleware)
  if (err.name === "ZodError" && err.issues) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  // Operational errors (AppError instances)
  if (isOperational) {
    return res.status(statusCode).json({
      success: false,
      message: err.message,
      ...(isDevelopment ? { details: err.stack } : {}),
    });
  }

  // Programming/unknown errors - never leak details
  return res.status(500).json({
    success: false,
    message: "Internal server error",
    ...(isDevelopment ? { details: err.message, code: err.code } : {}),
  });
};
