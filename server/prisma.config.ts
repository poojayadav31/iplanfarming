import "dotenv/config";
import { defineConfig } from "prisma/config";

const trimEnv = (value?: string) => value?.trim() ?? "";

const buildPostgresConnectionString = () => {
  const hasDiscreteConfig = [
    process.env.POSTGRES_HOST,
    process.env.POSTGRES_PORT,
    process.env.POSTGRES_USER,
    process.env.POSTGRES_PASSWORD,
    process.env.POSTGRES_DB,
  ].some((value) => trimEnv(value));

  if (!hasDiscreteConfig) {
    return undefined;
  }

  const user = trimEnv(process.env.POSTGRES_USER) || "postgres";
  const password = trimEnv(process.env.POSTGRES_PASSWORD);
  const host = trimEnv(process.env.POSTGRES_HOST) || "localhost";
  const port = trimEnv(process.env.POSTGRES_PORT) || "5432";
  const database = trimEnv(process.env.POSTGRES_DB) || "iplanfarmhouse";
  const schema = trimEnv(process.env.POSTGRES_SCHEMA) || "public";

  if (!password) {
    throw new Error(
      "FATAL: POSTGRES_PASSWORD must be set when using POSTGRES_* database configuration"
    );
  }

  const params = new URLSearchParams();
  if (schema) {
    params.set("schema", schema);
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(
    password
  )}@${host}:${port}/${database}?${params.toString()}`;
};

const derivedUrl = buildPostgresConnectionString();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL || derivedUrl,
    directUrl: process.env.DIRECT_URL || derivedUrl,
  },
});
