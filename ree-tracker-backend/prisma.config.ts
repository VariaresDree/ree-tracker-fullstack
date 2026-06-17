// ree-tracker-backend/prisma.config.ts
import * as dotenv from 'dotenv';
import { defineConfig } from "prisma/config";

// Force load the .env file explicitly
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("CRITICAL: DATABASE_URL is not defined in your .env file.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});