import { defineConfig } from 'drizzle-kit'
import { loadEnvConfig } from '@next/env'

// drizzle-kit doesn't load .env.local automatically — do it explicitly
loadEnvConfig(process.cwd())

// To push schema changes to production:
//   TURSO_DATABASE_URL=$TURSO_PROD_DATABASE_URL TURSO_AUTH_TOKEN=$TURSO_PROD_AUTH_TOKEN npx drizzle-kit push
// Or temporarily swap the vars in .env.local, push, then swap back.

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
})
