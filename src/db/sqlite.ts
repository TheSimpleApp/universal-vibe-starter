import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

// SQLite database for fast prototyping (no Docker required)
const sqlite = new Database('dev.db');
export const db = drizzle(sqlite, { schema });

// Simple query helper
export async function query<T>(sql: string, params: any[] = []): Promise<T[]> {
  const stmt = sqlite.prepare(sql);
  return stmt.all(...params) as T[];
}

export { schema };

