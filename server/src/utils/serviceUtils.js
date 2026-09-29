import { AppError } from "./errors.js";

export const getFarmerIdFromUser = (user, message = "Only farmers can access this resource") => {
  if (user?.role !== "FARMER" || !user.farmerId) {
    throw new AppError(message, 403);
  }
  return user.farmerId;
};
