// ree-tracker-backend/prisma.config.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

// `prisma/config`'s env() helper throws PrismaConfigEnvError when the var is
// unset — and `prisma generate` (run from postinstall on every `npm install`,
// including the platform build step) loads this file just to read the schema
// and emit client types; it never opens a connection. A DATABASE_URL that's
// momentarily missing (a fresh clone, a PR preview env, or a secret not yet
// pasted into the host dashboard) should not hard-crash that build. Fall back
// to a syntactically-valid placeholder so config loading always succeeds;
// commands that DO need a real connection (migrate, db push, studio) will
// still fail, but with a clear connection error instead of a config-load crash.
const PLACEHOLDER_DATABASE_URL = "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || PLACEHOLDER_DATABASE_URL,
  },
});