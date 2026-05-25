import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const databaseUrl =
  process.env.DATABASE_URL ??
  (process.env.NODE_ENV === "production"
    ? undefined
    : "postgres://inmycity:inmycity@localhost:5432/inmycity");

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set.",
  );
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool, { schema });

export * from "./schema";
