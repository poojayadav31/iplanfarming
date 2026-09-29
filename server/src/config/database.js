const DEFAULT_POSTGRES_HOST = "localhost";
const DEFAULT_POSTGRES_PORT = "5432";
const DEFAULT_POSTGRES_USER = "postgres";
const DEFAULT_POSTGRES_DB = "iplanfarmhouse";
const DEFAULT_POSTGRES_SCHEMA = "public";

const trimEnv = (value) => (typeof value === "string" ? value.trim() : "");

const hasDiscretePostgresConfig = () =>
  [
    process.env.POSTGRES_HOST,
    process.env.POSTGRES_PORT,
    process.env.POSTGRES_USER,
    process.env.POSTGRES_PASSWORD,
    process.env.POSTGRES_DB,
  ].some((value) => trimEnv(value));

const getDiscretePostgresConfig = () => {
  if (!hasDiscretePostgresConfig()) {
    return null;
  }

  const user = trimEnv(process.env.POSTGRES_USER) || DEFAULT_POSTGRES_USER;
  const password = trimEnv(process.env.POSTGRES_PASSWORD);
  const host = trimEnv(process.env.POSTGRES_HOST) || DEFAULT_POSTGRES_HOST;
  const port = trimEnv(process.env.POSTGRES_PORT) || DEFAULT_POSTGRES_PORT;
  const database = trimEnv(process.env.POSTGRES_DB) || DEFAULT_POSTGRES_DB;
  const schema = trimEnv(process.env.POSTGRES_SCHEMA) || DEFAULT_POSTGRES_SCHEMA;

  if (!password) {
    throw new Error(
      "FATAL: POSTGRES_PASSWORD must be set when using POSTGRES_* database configuration"
    );
  }

  return {
    user,
    password,
    host,
    port,
    database,
    schema,
  };
};

export const buildPostgresConnectionString = () => {
  const config = getDiscretePostgresConfig();

  if (!config) {
    return null;
  }

  const params = new URLSearchParams();
  if (config.schema) {
    params.set("schema", config.schema);
  }

  const credentials = `${encodeURIComponent(config.user)}:${encodeURIComponent(
    config.password
  )}`;
  const query = params.toString();

  return `postgresql://${credentials}@${config.host}:${config.port}/${config.database}${
    query ? `?${query}` : ""
  }`;
};
