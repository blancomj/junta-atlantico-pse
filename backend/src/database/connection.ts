import mysql from 'mysql2/promise';
import logger from '../../utils/logger';

const dbConfig = {
  host: process.env.DB_HOST || 'srv406.hstgr.io',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'u665041984_pse',
  password: process.env.DB_PASSWORD || 'e4uD5WoUtI@',
  database: process.env.DB_NAME || 'u665041984_pse',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
};

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    logger.info(`MySQL pool created: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  }
  return pool;
}

export async function testConnection(): Promise<boolean> {
  try {
    const connection = await getPool().getConnection();
    logger.info('MySQL connection successful');
    connection.release();
    return true;
  } catch (error) {
    logger.error('MySQL connection failed:', (error as Error).message);
    return false;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('MySQL pool closed');
  }
}

export default { getPool, testConnection, closePool };
