import { Request, Response } from 'express';
import authService from '../services/auth.service';
import emailService from '../../email/email.service';
import logger from '../../../../utils/logger';

class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email y password son requeridos' });
        return;
      }

      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const result = await authService.login({ email, password }, ip);

      logger.info(`Login exitoso: ${email}`);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.warn(`Login fallido: ${(error as Error).message}`);
      res.status(401).json({ success: false, message: (error as Error).message });
    }
  }

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ success: false, message: 'Refresh token requerido' });
        return;
      }

      const result = await authService.refreshAccessToken(refreshToken);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(401).json({ success: false, message: (error as Error).message });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
      res.json({ success: true, message: 'Sesion cerrada' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al cerrar sesion' });
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ success: false, message: 'Email requerido' });
        return;
      }

      const result = await authService.forgotPassword(email);
      
      // Send reset email if token exists
      if (result.token) {
        const resetLink = `${process.env.FRONTEND_URL || 'https://pse.juntaatlantico.co'}/reset-password?token=${result.token}`;
        try {
          await emailService.sendPasswordReset(email, resetLink);
          logger.info(`Correo de recuperacion enviado a: ${email}`);
        } catch (emailError) {
          logger.error(`Error enviando correo a ${email}:`, (emailError as Error).message);
        }
      }

      // Always return ok to not reveal email existence
      res.json({ success: true, message: 'Si el email existe, recibiras un link de recuperacion' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al procesar solicitud' });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        res.status(400).json({ success: false, message: 'Token y nueva contrasena requeridos' });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({ success: false, message: 'La contrasena debe tener minimo 8 caracteres' });
        return;
      }

      await authService.resetPassword(token, newPassword);
      res.json({ success: true, message: 'Contrasena actualizada correctamente' });
    } catch (error) {
      res.status(400).json({ success: false, message: (error as Error).message });
    }
  }

  async firstLogin(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        res.status(400).json({ success: false, message: 'Token y contrasena requeridos' });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({ success: false, message: 'La contrasena debe tener minimo 8 caracteres' });
        return;
      }

      await authService.completeFirstLogin(token, newPassword);
      res.json({ success: true, message: 'Cuenta activada correctamente. Ya puedes iniciar sesion.' });
    } catch (error) {
      res.status(400).json({ success: false, message: (error as Error).message });
    }
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ success: false, message: 'Contrasena actual y nueva requeridas' });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({ success: false, message: 'La contrasena debe tener minimo 8 caracteres' });
        return;
      }

      if (!req.user) {
        res.status(401).json({ success: false, message: 'No autenticado' });
        return;
      }

      await authService.changePassword(req.user.id, currentPassword, newPassword);
      res.json({ success: true, message: 'Contrasena actualizada correctamente' });
    } catch (error) {
      res.status(400).json({ success: false, message: (error as Error).message });
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'No autenticado' });
        return;
      }
      res.json({ success: true, data: req.user });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener usuario' });
    }
  }
}

export default new AuthController();
