import nodemailer from 'nodemailer';
import dns from 'dns';
import logger from '../../../utils/logger';

dns.setDefaultResultOrder('ipv4first');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.office365.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // STARTTLS (not SSL)
  connectionTimeout: 10000,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: true },
});

// Verify connection on startup
transporter.verify()
  .then(() => logger.info('SMTP connection verified'))
  .catch((err) => logger.error('SMTP connection failed:', err.message));

class EmailService {
  async sendInvitation(to: string, userName: string, invitationLink: string): Promise<void> {
    const entityName = 'Junta Regional de Calificacion de Invalidez del Atlantico';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color:#1e40af;padding:24px 32px;">
              <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:bold;">
                ${entityName}
              </h1>
              <p style="color:#93c5fd;margin:4px 0 0;font-size:13px;">Sistema de Pagos PSE</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="color:#111827;margin:0 0 16px;font-size:18px;">Hola, ${userName}</h2>
              <p style="color:#4b5563;margin:0 0 16px;font-size:14px;line-height:1.6;">
                Se ha creado una cuenta para ti en nuestro sistema de pagos. Para comenzar a utilizarla, necesitas crear tu contrasena de acceso.
              </p>
              <p style="color:#4b5563;margin:0 0 24px;font-size:14px;line-height:1.6;">
                Haz clic en el boton de abajo para activar tu cuenta:
              </p>

              <!-- Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:#16a34a;border-radius:6px;">
                    <a href="${invitationLink}"
                       style="display:inline-block;padding:12px 32px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;">
                      Activar Mi Cuenta
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#9ca3af;margin:24px 0 0;font-size:12px;line-height:1.5;">
                Este enlace expira en 72 horas. Si no solicitaste esta cuenta, puedes ignorar este correo.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;margin:0;font-size:11px;text-align:center;">
                ${entityName} &mdash; Sistema de Pagos PSE Avanza
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      await transporter.sendMail({
        from: `"${entityName}" <${process.env.SMTP_USER}>`,
        to,
        subject: 'Activa tu cuenta - Sistema de Pagos PSE',
        html,
      });
      logger.info(`Invitation email sent to ${to}`);
    } catch (error) {
      logger.error(`Failed to send invitation email to ${to}:`, (error as Error).message);
      throw new Error('Error al enviar correo de invitacion');
    }
  }

  async sendPasswordReset(to: string, resetLink: string): Promise<void> {
    const entityName = 'Junta Regional de Calificacion de Invalidez del Atlantico';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color:#dc2626;padding:24px 32px;">
              <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:bold;">
                ${entityName}
              </h1>
              <p style="color:#fca5a5;margin:4px 0 0;font-size:13px;">Sistema de Pagos PSE</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="color:#111827;margin:0 0 16px;font-size:18px;">Recuperar contrasena</h2>
              <p style="color:#4b5563;margin:0 0 16px;font-size:14px;line-height:1.6;">
                Recibimos una solicitud para restablecer la contrasena de tu cuenta. Haz clic en el boton de abajo para crear una nueva contrasena:
              </p>

              <!-- Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:#dc2626;border-radius:6px;">
                    <a href="${resetLink}"
                       style="display:inline-block;padding:12px 32px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;">
                      Restablecer Contrasena
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#9ca3af;margin:24px 0 0;font-size:12px;line-height:1.5;">
                Este enlace expira en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;margin:0;font-size:11px;text-align:center;">
                ${entityName} &mdash; Sistema de Pagos PSE Avanza
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      await transporter.sendMail({
        from: `"${entityName}" <${process.env.SMTP_USER}>`,
        to,
        subject: 'Restablecer contrasena - Sistema de Pagos PSE',
        html,
      });
      logger.info(`Password reset email sent to ${to}`);
    } catch (error) {
      logger.error(`Failed to send password reset email to ${to}:`, (error as Error).message);
      throw new Error('Error al enviar correo de recuperacion');
    }
  }
}

export default new EmailService();
