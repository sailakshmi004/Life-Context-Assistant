#!/usr/bin/env node
/**
 * Applies a SQL migration to your Supabase Postgres database.
 *
 * Usage:
 *   npm run db:migrate
 *   npm run db:migrate -- supabase/schema.sql
 *
 * Requires DATABASE_URL in .env.local (Supabase -> Project Settings ->
 * Database -> Connection string, the direct `postgresql://...:5432/...` URI).
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

/** Minimal dotenv loader so this works with .env.local or .env. */
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1] in process.env) continue;
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const connectionString = process.env.DATABASE_URL;

if (
  !connectionString ||
  /your-|replace-with|change-me|placeholder/i.test(connectionString)
) {
  console.error(
    "DATABASE_URL is missing or still a placeholder.\n" +
      "Add your Supabase Postgres connection string to .env.local first:\n" +
      "  DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
  );
  process.exit(1);
}

const migrationsDir = path.resolve("supabase/migrations");
const migrationFiles = fs.existsSync(migrationsDir)
  ? fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort()
  : [];

const defaultMigration =
  migrationFiles.length > 0
    ? path.join(migrationsDir, migrationFiles[migrationFiles.length - 1])
    : path.resolve("supabase/schema.sql");

const migrationFile = path.resolve(process.argv[2] || defaultMigration);

if (!fs.existsSync(migrationFile)) {
  console.error(`Migration file not found: ${migrationFile}`);
  process.exit(1);
}

const sql = fs.readFileSync(migrationFile, "utf8");
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log(`Applied ${path.basename(migrationFile)} successfully.`);
} catch (error) {
  console.error(
    "Migration failed:",
    error instanceof Error ? error.message : String(error)
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
