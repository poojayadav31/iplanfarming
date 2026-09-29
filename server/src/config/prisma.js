import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildPostgresConnectionString } from "./database.js";

const resolveConnectionString = () => {
  const runtimeUrl = process.env.PRISMA_RUNTIME_DATABASE_URL?.trim();
  const derivedUrl = buildPostgresConnectionString();
  const directUrl = process.env.DIRECT_URL?.trim() || derivedUrl;
  const pooledUrl = process.env.DATABASE_URL?.trim() || derivedUrl;

  if (runtimeUrl) {
    return runtimeUrl;
  }

  if (!directUrl && !pooledUrl) {
    throw new Error(
      "FATAL: Set PRISMA_RUNTIME_DATABASE_URL, DIRECT_URL, or DATABASE_URL"
    );
  }

  // Prefer a direct connection for the long-lived Node server in development.
  if (process.env.NODE_ENV !== "production") {
    return directUrl || pooledUrl;
  }

  return pooledUrl || directUrl;
};

const adapter = new PrismaPg({
  connectionString: resolveConnectionString(),
});

const prisma = new PrismaClient({ adapter });

export default prisma;
