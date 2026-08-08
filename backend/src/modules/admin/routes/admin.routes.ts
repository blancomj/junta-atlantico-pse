import { Router, Request, Response } from 'express';
import { getPool } from '../../../database/connection';
import { authenticate, requireRole } from '../../auth/middleware/auth.middleware';
import authService from '../../auth/services/auth.service';
import emailService from '../../email/email.service';
import logger from '../../../../utils/logger';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const router = Router();

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = getPool();
    let where = '';
    const params: any[] = [];

    if (req.query.role) {
      where = 'WHERE u.role = ?';
      params.push(req.query.role);
    }

    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.is_active, u.status,
              u.last_login, u.created_at, e.entity_name
       FROM entity_users u
       JOIN entities e ON u.entity_id = e.id
       ${where}
       ORDER BY u.created_at DESC`,
      params
    ) as any[];
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error listing users:', (error as Error).message);
    res.status(500).json({ success: false, message: 'Error al obtener usuarios' });
  }
});

router.post('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email, role } = req.body;

    if (!fullName || !email) {
      res.status(400).json({ success: false, message: 'Nombre y email son requeridos' });
      return;
    }

    const pool = getPool();

    const [existing] = await pool.query('SELECT id FROM entity_users WHERE email = ?', [email]) as any[];
    if (existing.length > 0) {
      res.status(409).json({ success: false, message: 'Ya existe un usuario con ese email' });
      return;
    }

    const user = req.user!;
    const userId = crypto.randomUUID();

    // Generate a random placeholder password (will be replaced on first login)
    const placeholderHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 12);

    await pool.query(
      `INSERT INTO entity_users (id, entity_id, email, full_name, role, password_hash, status, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', 0)`,
      [userId, user.entityId, email, fullName, role || 'user', placeholderHash]
    );

    logger.info(`User created by admin: ${email} (status: pending)`);

    // Auto-generate invitation token
    const token = await authService.generateInvitationToken(userId);
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const invitationLink = `${baseUrl}/first-login?token=${token}`;

    // Send invitation email
    try {
      await emailService.sendInvitation(email, fullName, invitationLink);
      logger.info(`Invitation email sent to ${email}`);
    } catch (emailError) {
      logger.error(`Failed to send invitation email to ${email}:`, (emailError as Error).message);
      // Don't fail the user creation if email fails
    }

    res.json({
      success: true,
      data: { id: userId, email, fullName, role: role || 'user', invitationLink }
    });
  } catch (error) {
    logger.error('Error creating user:', (error as Error).message);
    res.status(500).json({ success: false, message: 'Error al crear usuario' });
  }
});

router.post('/users/:id/invite', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const [rows] = await pool.query(
      'SELECT id, email, full_name, status FROM entity_users WHERE id = ?',
      [id]
    ) as any[];

    if (rows.length === 0) {
      res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      return;
    }

    const targetUser = rows[0];

    const token = await authService.generateInvitationToken(id);
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const invitationLink = `${baseUrl}/first-login?token=${token}`;

    // Send invitation email (non-blocking)
    let emailSent = false;
    try {
      await emailService.sendInvitation(targetUser.email, targetUser.full_name, invitationLink);
      emailSent = true;
      logger.info(`Invitation email resent to ${targetUser.email}`);
    } catch (emailError) {
      logger.error(`Failed to send invitation email to ${targetUser.email}:`, (emailError as Error).message);
    }

    res.json({
      success: true,
      message: emailSent
        ? `Invitacion enviada a ${targetUser.email}`
        : `No se pudo enviar el correo. Enlace copiable:`,
      invitationLink,
      emailSent
    });
  } catch (error) {
    logger.error('Error sending invitation:', (error as Error).message);
    res.status(500).json({ success: false, message: 'Error al enviar invitacion' });
  }
});

router.patch('/users/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { fullName, role, is_active } = req.body;
    const pool = getPool();

    const [rows] = await pool.query('SELECT id FROM entity_users WHERE id = ?', [id]) as any[];
    if (rows.length === 0) {
      res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      return;
    }

    const fields: string[] = [];
    const params: any[] = [];

    if (fullName !== undefined) {
      fields.push('full_name = ?');
      params.push(fullName);
    }
    if (role !== undefined) {
      fields.push('role = ?');
      params.push(role);
    }
    if (is_active !== undefined) {
      fields.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (fields.length === 0) {
      res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
      return;
    }

    params.push(id);
    await pool.query(`UPDATE entity_users SET ${fields.join(', ')} WHERE id = ?`, params);

    logger.info(`User updated by admin: ${id}`);
    res.json({ success: true, message: 'Usuario actualizado' });
  } catch (error) {
    logger.error('Error updating user:', (error as Error).message);
    res.status(500).json({ success: false, message: 'Error al actualizar usuario' });
  }
});

router.patch('/users/:id/toggle-active', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const [rows] = await pool.query('SELECT id, is_active FROM entity_users WHERE id = ?', [id]) as any[];
    if (rows.length === 0) {
      res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      return;
    }

    const newActive = rows[0].is_active ? 0 : 1;
    await pool.query('UPDATE entity_users SET is_active = ? WHERE id = ?', [newActive, id]);

    logger.info(`User ${id} ${newActive ? 'activated' : 'deactivated'}`);
    res.json({ success: true, message: newActive ? 'Usuario activado' : 'Usuario desactivado' });
  } catch (error) {
    logger.error('Error toggling user:', (error as Error).message);
    res.status(500).json({ success: false, message: 'Error al cambiar estado del usuario' });
  }
});

export default router;
