import { config } from 'dotenv';
// Match the scripts' convention: local secrets live in .env.local (see
// .env.example); fall back to .env; on Railway the injected env var wins.
config({ path: '.env.local' });
config();
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
