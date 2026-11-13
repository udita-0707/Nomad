import { defineConfig } from 'drizzle-kit';

// Load DATABASE_URL from the root .env (Node 20.12+).
try {
  process.loadEnvFile('../../.env');
} catch {
  // no .env file; rely on the environment
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
