import jwt from "jsonwebtoken";
import { AppError } from "./errors.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable is not set");
}

export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AppError("Token has expired", 401);
    }
    if (error.name === "JsonWebTokenError") {
      throw new AppError("Invalid token", 401);
    }
    throw new AppError("Token verification failed", 401);
  }
};
