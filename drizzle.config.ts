import { defineConfig } from "drizzle-kit";

// Generates SQL migrations for Cloudflare D1. Wrangler applies them:
//   local:  pnpm db:migrate:local
//   remote: pnpm db:migrate:remote (also runs automatically on deploy)
export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/d1",
  dialect: "sqlite",
});
