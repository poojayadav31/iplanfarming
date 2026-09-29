import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export const hashPassword = async (plainText) => {
  return bcrypt.hash(plainText, SALT_ROUNDS);
};

export const comparePassword = async (plainText, hash) => {
  return bcrypt.compare(plainText, hash);
};
