import { AppError } from "../utils/errors.js";

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        `Access denied. Required role(s): ${allowedRoles.join(", ")}`,
        403
      );
    }

    next();
  };
};
