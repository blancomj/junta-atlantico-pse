import fs from 'fs';
import path from 'path';
import { getPool } from './connection';
import logger from '../../utils/logger';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

function splitStatements(sql: string): string[] {
  // Remove single-line comments, then split by semicolon
  const cleaned = sql.replace(/--.*$/gm, '').trim();
  return cleaned
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

export async function runMigrations(): Promise<void> {
  try {
    const pool = getPool();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const [appliedRows] = await pool.query('SELECT name FROM migrations') as any[];
    const applied = appliedRows.map((r: any) => r.name);

    for (const file of files) {
      if (applied.includes(file)) {
        continue;
      }

      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      const statements = splitStatements(sql);

      logger.info(`Applying migration: ${file} (${statements.length} statements)`);

      for (const stmt of statements) {
        await pool.query(stmt);
      }

      await pool.query('INSERT INTO migrations (name) VALUES (?)', [file]);
      logger.info(`Migration applied: ${file}`);
    }

    logger.info('All migrations applied successfully');
  } catch (error) {
    logger.error('Migration error:', (error as Error).message);
    throw error;
  }
}
