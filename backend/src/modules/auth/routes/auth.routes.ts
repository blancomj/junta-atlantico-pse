import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { loginLimiter, forgotPasswordLimiter, authLimiter } from '../../../../middleware/rateLimit.middleware';

const router = Router();

router.post('/login', loginLimiter, authController.login);
router.post('/refresh', authLimiter, authController.refresh);
router.post('/logout', authLimiter, authController.logout);
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.post('/first-login', authLimiter, authController.firstLogin);
router.post('/change-password', authenticate, authLimiter, authController.changePassword);
router.patch('/profile', authenticate, authLimiter, authController.updateProfile);
router.get('/me', authenticate, authController.me);

export default router;
