import prisma from "../config/prisma.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { generateToken } from "../utils/jwt.js";
import { AppError } from "../utils/errors.js";

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  farmer: {
    select: {
      id: true,
      isAccepted: true,
    },
  },
  customer: {
    select: {
      isAccepted: true,
    },
  },
  expert: {
    select: {
      isAccepted: true,
    },
  },
  createdAt: true,
  updatedAt: true,
};

const mapUserWithAcceptance = (user) => {
  const acceptance =
    user.role === "FARMER"
      ? user.farmer?.isAccepted ?? false
      : user.role === "EXPERT"
      ? user.expert?.isAccepted ?? false
      : user.role === "CUSTOMER"
      ? user.customer?.isAccepted ?? false
      : true;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    farmerId: user.farmer?.id ?? null,
    isAccepted: acceptance,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const normalizeEmail = (email) => {
  if (typeof email !== "string") {
    throw new AppError("Email is required", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new AppError("Email is required", 400);
  }

  return normalizedEmail;
};

export const registerUser = async ({ name, email, password, role }) => {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await prisma.user.findFirst({
    where: { email: normalizedEmail },
  });
  if (existingUser) {
    throw new AppError("A user with this email already exists", 409);
  }

  const hashedPassword = await hashPassword(password);

  const createdUserId = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role,
      },
      select: { id: true },
    });

    if (role === "FARMER") {
      await tx.farmer.create({
        data: { userId: createdUser.id, isAccepted: true },
      });
    } else if (role === "CUSTOMER") {
      await tx.customer.create({
        data: { userId: createdUser.id, isAccepted: true },
      });
    } else if (role === "EXPERT") {
      await tx.expert.create({
        data: { userId: createdUser.id, isAccepted: true },
      });
    }

    return createdUser.id;
  });

  const user = await prisma.user.findUnique({
    where: { id: createdUserId },
    select: USER_SELECT,
  });

  if (!user) {
    throw new AppError("Unable to complete registration", 500);
  }

  const safeUser = mapUserWithAcceptance(user);
  const token = generateToken({ userId: user.id, role: user.role });

  return { user: safeUser, token };
};

export const loginUser = async ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);

  if (typeof password !== "string" || !password) {
    throw new AppError("Password is required", 400);
  }

  const user = await prisma.user.findFirst({
    where: { email: normalizedEmail },
    include: {
      farmer: true,
      customer: true,
      expert: true,
    },
  });
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = generateToken({ userId: user.id, role: user.role });

  const safeUser = mapUserWithAcceptance(user);
  return { user: safeUser, token };
};

export const getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_SELECT,
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return mapUserWithAcceptance(user);
};
