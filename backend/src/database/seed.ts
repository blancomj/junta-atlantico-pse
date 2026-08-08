import dotenv from 'dotenv';
dotenv.config();

import { testConnection, closePool } from './connection';
import { runMigrations } from './migrator';
import authService from '../modules/auth/services/auth.service';
import logger from '../../utils/logger';

async function seed() {
  try {
    const connected = await testConnection();
    if (!connected) {
      logger.error('No se pudo conectar a la base de datos');
      process.exit(1);
    }

    await runMigrations();

    // Create test entity
    const entity = await authService.createEntity(
      'JUNTA REGIONAL DE CALIFICACION DE INVALIDEZ DEL ATLANTICO',
      '802016503',
      'admin@juntaatlantico.co'
    );

    // Create admin user
    const admin = await authService.createUser(
      'admin@juntaatlantico.co',
      'Admin123!',
      'Administrador General',
      entity.id,
      'admin'
    );

    // Create regular user
    const user = await authService.createUser(
      'usuario@juntaatlantico.co',
      'Usuario123!',
      'Usuario Prueba',
      entity.id,
      'user'
    );

    logger.info('=== Seed completado ===');
    logger.info(`Entidad: ${entity.entityName} (ID: ${entity.id})`);
    logger.info(`Admin: ${admin.email} / Admin123!`);
    logger.info(`Usuario: ${user.email} / Usuario123!`);

    await closePool();
    process.exit(0);
  } catch (error) {
    logger.error('Error en seed:', (error as Error).message);
    await closePool();
    process.exit(1);
  }
}

seed();
