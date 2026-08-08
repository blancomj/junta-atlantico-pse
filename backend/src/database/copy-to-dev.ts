/**
 * Script para copiar datos de produccion a desarrollo.
 * 
 * Uso:
 *   npm run db:copy-to-dev
 */

import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Cargar ambos archivos .env
const envProd = dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
const envDev = dotenv.config({ path: path.join(__dirname, '..', '..', '.env.development') });

const PROD_CONFIG = {
  host: envProd.parsed?.DB_HOST || 'srv406.hstgr.io',
  port: parseInt(envProd.parsed?.DB_PORT || '3306', 10),
  user: envProd.parsed?.DB_USER || 'u665041984_pse',
  password: envProd.parsed?.DB_PASSWORD || '',
  database: envProd.parsed?.DB_NAME || 'u665041984_pse',
};

const DEV_CONFIG = {
  host: envDev.parsed?.DB_HOST || 'srv406.hstgr.io',
  port: parseInt(envDev.parsed?.DB_PORT || '3306', 10),
  user: envDev.parsed?.DB_USER || 'u665041984_psep',
  password: envDev.parsed?.DB_PASSWORD || '',
  database: envDev.parsed?.DB_NAME || 'u665041984_psep',
};

// Orden de tablas respetando foreign keys
const TABLES = [
  'entities',
  'entity_users',
  'refresh_tokens',
  'password_reset_tokens',
  'batch_payments',
  'batch_payment_beneficiaries',
  'batch_payment_attempts',
  'audit_log'
];

async function copyData() {
  console.log('=== Copiando datos de produccion a desarrollo ===\n');
  console.log(`Produccion: ${PROD_CONFIG.host}/${PROD_CONFIG.database}`);
  console.log(`Desarrollo: ${DEV_CONFIG.host}/${DEV_CONFIG.database}\n`);

  const prodConn = await mysql.createConnection(PROD_CONFIG);
  const devConn = await mysql.createConnection(DEV_CONFIG);

  try {
    for (const table of TABLES) {
      console.log(`Procesando: ${table}`);

      // Leer datos de produccion
      const [rows] = await prodConn.query(`SELECT * FROM \`${table}\``) as any[];
      console.log(`  Registros en produccion: ${rows.length}`);

      if (rows.length === 0) {
        console.log(`  Saltando (sin datos)\n`);
        continue;
      }

      // Limpiar tabla en desarrollo
      await devConn.query(`DELETE FROM \`${table}\``);
      console.log(`  Tabla limpiada en desarrollo`);

      // Insertar datos
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => '?').join(', ');
        const insertSQL = `INSERT INTO \`${table}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`;

        for (const row of rows) {
          const values = columns.map(col => row[col]);
          await devConn.query(insertSQL, values);
        }
      }

      console.log(`  Registros insertados: ${rows.length}\n`);
    }

    console.log('=== Copia completada exitosamente ===');
  } catch (error: any) {
    console.error('Error durante la copia:', error.message);
    process.exit(1);
  } finally {
    await prodConn.end();
    await devConn.end();
  }
}

copyData();
