/**
 * Script para aplicar migraciones SQL a la base de datos.
 * 
 * Uso:
 *   npx ts-node src/database/apply-migrations.ts
 * 
 * Lee todos los archivos .sql de src/database/migrations/ en orden
 * y los ejecuta contra la base de datos configurada en .env
 */

import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Cargar .env.development si NODE_ENV=development, si no .env
const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
dotenv.config({ path: path.join(__dirname, '..', '..', envFile) });

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function applyMigrations() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pse_dev',
    multipleStatements: true
  });

  console.log(`Conectado a: ${process.env.DB_HOST}/${process.env.DB_NAME}`);

  // Crear tabla de control de migraciones si no existe
  await connection.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Obtener migraciones ya aplicadas
  const [applied] = await connection.query('SELECT filename FROM _migrations') as any[];
  const appliedSet = new Set(applied.map((r: any) => r.filename));

  // Leer archivos de migración
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let appliedCount = 0;

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`  ${file} - ya aplicada, omitiendo`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    
    try {
      await connection.query(sql);
      await connection.query('INSERT INTO _migrations (filename) VALUES (?)', [file]);
      console.log(`  ${file} - aplicada OK`);
      appliedCount++;
    } catch (error: any) {
      console.error(`  ${file} - ERROR: ${error.message}`);
      await connection.end();
      process.exit(1);
    }
  }

  if (appliedCount === 0) {
    console.log('\nNo hay migraciones pendientes.');
  } else {
    console.log(`\n${appliedCount} migracion(es) aplicada(s) correctamente.`);
  }

  await connection.end();
}

applyMigrations().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
