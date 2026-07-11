import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // Satu sumber schema — barrel yang me-re-export schema tiap modul.
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
