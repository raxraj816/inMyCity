import { defineConfig } from "drizzle-kit";
import path from "path";

const databaseUrl =
  process.env.DATABASE_URL ??
  (process.env.NODE_ENV === "production"
    ? undefined
    : "postgres://inmycity:inmycity@localhost:5432/inmycity");

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
