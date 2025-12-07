import path from "path";
import * as parseConnectionString from "pg-connection-string";

export default ({ env }) => {
  const client = env("DB_CLIENT", "sqlite");

  // Función para obtener la configuración de PostgreSQL
  const getPostgresConfig = () => {
    const databaseUrl = env("DATABASE_URL");

    // Si existe DATABASE_URL, usar la cadena de conexión (para Supabase/Render)
    if (databaseUrl) {
      const parsed = parseConnectionString.parse(databaseUrl);
      return {
        connection: {
          host: parsed.host || undefined,
          port: parsed.port ? parseInt(parsed.port, 10) : undefined,
          database: parsed.database || undefined,
          user: parsed.user || undefined,
          password: parsed.password || undefined,
          ssl:
            parsed.sslmode === "require" || parsed.sslmode === "prefer"
              ? {
                  rejectUnauthorized: env.bool(
                    "DATABASE_SSL_REJECT_UNAUTHORIZED",
                    true,
                  ),
                }
              : env.bool("DATABASE_SSL", false) && {
                  rejectUnauthorized: env.bool(
                    "DATABASE_SSL_REJECT_UNAUTHORIZED",
                    true,
                  ),
                },
          schema: env("DATABASE_SCHEMA", "public"),
        },
        pool: {
          min: env.int("DATABASE_POOL_MIN", 2),
          max: env.int("DATABASE_POOL_MAX", 10),
        },
      };
    }

    // Si no existe DATABASE_URL, usar configuración individual (fallback)
    return {
      connection: {
        host: env("DB_HOST", "db.rfmbddmubnnkbfnjygqz.supabase.co"),
        port: env.int("DB_PORT", 5432),
        database: env("DB_NAME", "postgres"),
        user: env("DB_USERNAME", "postgres"),
        password: env("DB_PASSWORD", ""),
        ssl: {
          rejectUnauthorized: env.bool(
            "DATABASE_SSL_REJECT_UNAUTHORIZED",
            true,
          ),
        },
        schema: env("DATABASE_SCHEMA", "public"),
      },
      pool: {
        min: env.int("DATABASE_POOL_MIN", 2),
        max: env.int("DATABASE_POOL_MAX", 10),
      },
    };
  };

  const connections = {
    mysql: {
      connection: {
        host: env("DB_HOST", "localhost"),
        port: env.int("DB_PORT", 3306),
        database: env("DB_NAME", "strapi"),
        user: env("DB_USERNAME", "strapi"),
        password: env("DB_PASSWORD", "strapi"),
        ssl: env.bool("DATABASE_SSL", false) && {
          key: env("DATABASE_SSL_KEY", undefined),
          cert: env("DATABASE_SSL_CERT", undefined),
          ca: env("DATABASE_SSL_CA", undefined),
          capath: env("DATABASE_SSL_CAPATH", undefined),
          cipher: env("DATABASE_SSL_CIPHER", undefined),
          rejectUnauthorized: env.bool(
            "DATABASE_SSL_REJECT_UNAUTHORIZED",
            true,
          ),
        },
      },
      pool: {
        min: env.int("DATABASE_POOL_MIN", 2),
        max: env.int("DATABASE_POOL_MAX", 10),
      },
    },
    postgres: getPostgresConfig(),
    sqlite: {
      connection: {
        filename: path.join(
          __dirname,
          "..",
          "..",
          env("DATABASE_FILENAME", ".tmp/data.db"),
        ),
      },
      useNullAsDefault: true,
    },
  };

  return {
    connection: {
      client,
      ...connections[client],
      acquireConnectionTimeout: env.int("DATABASE_CONNECTION_TIMEOUT", 60000),
    },
  };
};
