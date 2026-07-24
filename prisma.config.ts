// prisma.config.ts
// Prisma 7 configuration file — separates connection config from schema.
// This file is read by the Prisma CLI (migrate, db push, studio, generate).
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
