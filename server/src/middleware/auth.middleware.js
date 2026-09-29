import { verifyToken } from "../utils/jwt.js";
import { AppError } from "../utils/errors.js";
import prisma from "../config/prisma.js";

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Authentication required. No token provided.", 401);
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    throw new AppError("Authentication required. Malformed token.", 401);
  }

  const decoded = verifyToken(token);
  const userId =
    typeof decoded === "object" && decoded !== null
      ? decoded.userId ?? decoded.id ?? decoded.sub ?? null
      : null;

  if (!userId || typeof userId !== "string") {
    throw new AppError("Invalid token payload. Please log in again.", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      farmer: {
        select: {
          id: true,
          isAccepted: true,
        },
      },
      customer: {
        select: {
          id: true,
          isAccepted: true,
        },
      },
      expert: {
        select: {
          id: true,
          isAccepted: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError("User belonging to this token no longer exists", 401);
  }

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    farmerId: user.farmer?.id ?? null,
    customerId: user.customer?.id ?? null,
    expertId: user.expert?.id ?? null,
    isAccepted:
      user.role === "FARMER"
        ? user.farmer?.isAccepted ?? false
        : user.role === "EXPERT"
        ? user.expert?.isAccepted ?? false
        : user.role === "CUSTOMER"
        ? user.customer?.isAccepted ?? false
        : true,
    createdAt: user.createdAt,
  };
  next();
};
