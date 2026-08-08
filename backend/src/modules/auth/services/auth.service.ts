import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getPool } from '../../../database/connection';
import { AuthUser, JwtPayload, LoginRequest, LoginResponse } from '../types/auth.types';
import logger from '../../../../utils/logger';

const JWT_SECRET: string = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está definido en las variables de entorno. El servidor no puede arrancar de forma segura.');
  }
  return secret;
})();
const JWT_EXPIRES_IN = '30m';
const REFRESH_TOKEN_EXPIRES_DAYS = 7;
const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 15;

class AuthService {
  async login(data: LoginRequest, _ip: string): Promise<LoginResponse> {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT u.*, e.entity_name FROM entity_users u
       JOIN entities e ON u.entity_id = e.id
       WHERE u.email = ? AND u.is_active = 1`,
      [data.email]
    ) as any[];

    if (rows.length === 0) {
      throw new Error('Credenciales invalidas');
    }

    const user = rows[0];

    // Check if user needs to set password (pending invitation)
    if (user.status === 'pending') {
      throw new Error('Debes activar tu cuenta. Revisa tu correo electronico para el enlace de activacion.');
    }

    // Check lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
      throw new Error(`Cuenta bloqueada. Intenta de nuevo en ${minutesLeft} minutos`);
    }

    // Check password
    const isValid = await bcrypt.compare(data.password, user.password_hash);
    if (!isValid) {
      const failedAttempts = (user.failed_attempts || 0) + 1;
      const lockUntil = failedAttempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60000)
        : null;

      await pool.query(
        'UPDATE entity_users SET failed_attempts = ?, locked_until = ? WHERE id = ?',
        [failedAttempts, lockUntil, user.id]
      );

      throw new Error('Credenciales invalidas');
    }

    // Reset failed attempts
    await pool.query(
      'UPDATE entity_users SET failed_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Generate tokens
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      entityId: user.entity_id
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        nit: user.nit || '',
        direccion: user.direccion || '',
        telefono: user.telefono || '',
        role: user.role,
        entityName: user.entity_name || '',
        mustChangePassword: user.must_change_password ? true : false
      }
    };
  }

  async generateRefreshToken(userId: string): Promise<string> {
    const pool = getPool();
    const token = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), userId, token, expiresAt]
    );

    return token;
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    const pool = getPool();

    const [tokenRows] = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = ? AND revoked = 0 AND expires_at > NOW()',
      [refreshToken]
    ) as any[];

    if (tokenRows.length === 0) {
      throw new Error('Refresh token invalido o expirado');
    }

    const stored = tokenRows[0];

    const [userRows] = await pool.query(
      'SELECT * FROM entity_users WHERE id = ? AND is_active = 1',
      [stored.user_id]
    ) as any[];

    if (userRows.length === 0) {
      throw new Error('Usuario no encontrado o inactivo');
    }

    const user = userRows[0];

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      entityId: user.entity_id
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return { accessToken };
  }

  async logout(refreshToken: string): Promise<void> {
    const pool = getPool();
    await pool.query('UPDATE refresh_tokens SET revoked = 1 WHERE token = ?', [refreshToken]);
  }

  async forgotPassword(email: string): Promise<{ token: string }> {
    const pool = getPool();

    const [userRows] = await pool.query(
      'SELECT id FROM entity_users WHERE email = ? AND is_active = 1',
      [email]
    ) as any[];

    if (userRows.length === 0) {
      // Return ok even if user doesn't exist (don't reveal existence)
      return { token: '' };
    }

    const user = userRows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), user.id, token, expiresAt]
    );

    return { token };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const pool = getPool();

    const [tokenRows] = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > NOW()',
      [token]
    ) as any[];

    if (tokenRows.length === 0) {
      throw new Error('Token invalido o expirado');
    }

    const stored = tokenRows[0];

    const [userRows] = await pool.query(
      'SELECT id FROM entity_users WHERE id = ?',
      [stored.user_id]
    ) as any[];

    if (userRows.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await pool.query(
      'UPDATE entity_users SET password_hash = ?, failed_attempts = 0, locked_until = NULL, must_change_password = 0 WHERE id = ?',
      [passwordHash, stored.user_id]
    );

    await pool.query('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [stored.id]);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const pool = getPool();

    const [userRows] = await pool.query(
      'SELECT password_hash FROM entity_users WHERE id = ?',
      [userId]
    ) as any[];

    if (userRows.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    const user = userRows[0];

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw new Error('Contrasena actual incorrecta');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await pool.query(
      'UPDATE entity_users SET password_hash = ?, must_change_password = 0 WHERE id = ?',
      [passwordHash, userId]
    );
  }

  async updateProfile(userId: string, nit: string, direccion: string, telefono: string): Promise<void> {
    const pool = getPool();

    await pool.query(
      'UPDATE entity_users SET nit = ?, direccion = ?, telefono = ? WHERE id = ?',
      [nit, direccion, telefono, userId]
    );
  }

  async verifyAccessToken(token: string): Promise<AuthUser> {
    const pool = getPool();
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

      const [rows] = await pool.query(
        `SELECT u.id, u.email, u.full_name, u.nit, u.direccion, u.telefono, u.role, u.entity_id, e.entity_name
         FROM entity_users u
         JOIN entities e ON u.entity_id = e.id
         WHERE u.id = ? AND u.is_active = 1`,
        [decoded.userId]
      ) as any[];

      if (rows.length === 0) {
        throw new Error('Usuario no encontrado o inactivo');
      }

      const user = rows[0];
      return {
        id: user.id,
        email: user.email,
        name: user.full_name,
        nit: user.nit || '',
        direccion: user.direccion || '',
        telefono: user.telefono || '',
        role: user.role,
        entityId: user.entity_id,
        entityName: user.entity_name || ''
      };
    } catch (error) {
      throw new Error('Token invalido o expirado');
    }
  }

  // Helper for seeding - add user directly
  async createUser(email: string, password: string, fullName: string, entityId: string, role: 'admin' | 'user' = 'user'): Promise<any> {
    const pool = getPool();
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userId = crypto.randomUUID();

    await pool.query(
      `INSERT INTO entity_users (id, entity_id, email, full_name, role, password_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, entityId, email, fullName, role, passwordHash]
    );

    logger.info(`User created: ${email} (${role})`);
    return { id: userId, email, fullName, role, entityId };
  }

  // Helper for seeding - add entity directly
  async createEntity(entityName: string, nit: string, email: string): Promise<any> {
    const pool = getPool();
    const entityId = crypto.randomUUID();

    await pool.query(
      `INSERT INTO entities (id, email, entity_name, entity_type, nit)
       VALUES (?, ?, ?, 'empresa', ?)`,
      [entityId, email, entityName, nit]
    );

    logger.info(`Entity created: ${entityName} (NIT: ${nit})`);
    return { id: entityId, entityName, nit, email };
  }

  // Generate invitation token for new user
  async generateInvitationToken(userId: string): Promise<string> {
    const pool = getPool();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    // Delete any existing invitation tokens for this user
    await pool.query(
      'UPDATE entity_users SET invitation_token = NULL, invitation_expires_at = NULL WHERE id = ?',
      [userId]
    );

    await pool.query(
      'UPDATE entity_users SET invitation_token = ?, invitation_expires_at = ? WHERE id = ?',
      [token, expiresAt, userId]
    );

    logger.info(`Invitation token generated for user ${userId}`);
    return token;
  }

  // Complete first login with invitation token
  async completeFirstLogin(token: string, newPassword: string): Promise<void> {
    const pool = getPool();

    // Check invitation token from entity_users
    const [userRows] = await pool.query(
      `SELECT id, email FROM entity_users WHERE invitation_token = ? AND invitation_expires_at > NOW()`,
      [token]
    ) as any[];

    if (userRows.length === 0) {
      throw new Error('Token de invitacion invalido o expirado');
    }

    const user = userRows[0];
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await pool.query(
      `UPDATE entity_users
       SET password_hash = ?, status = 'active', is_active = 1,
           invitation_token = NULL, invitation_expires_at = NULL,
           password_setup_at = NOW(), failed_attempts = 0, locked_until = NULL
       WHERE id = ?`,
      [passwordHash, user.id]
    );

    logger.info(`First login completed for user ${user.email}`);
  }
}

export default new AuthService();
