import { Router } from 'express';
import express from 'express';
import multer from 'multer';
import batchPaymentController from '../controllers/batch-payment.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { verifyPseCallbackSignature } from '../middleware/pse-callback.middleware';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos .xlsx o .xls'));
    }
  }
});

// ─── Ruta pública: PSE Callback (servidor externo, sin JWT) ───────────────────
// Se usa express.raw() para recibir el body sin parsear y poder verificar
// la firma HMAC-SHA256 sobre el payload original.
router.post(
  '/pse-callback',
  express.raw({ type: '*/*' }),
  verifyPseCallbackSignature,
  batchPaymentController.pseCallback
);

// ─── Rutas protegidas: requieren JWT ─────────────────────────────────────────
router.use(authenticate);

router.post('/upload', upload.single('file'), batchPaymentController.upload);
router.post('/', batchPaymentController.create);
router.get('/', batchPaymentController.list);
router.get('/search-beneficiary', batchPaymentController.searchBeneficiary);
router.get('/:id', batchPaymentController.detail);
router.post('/:id/pay', batchPaymentController.pay);
router.post('/:id/annul', batchPaymentController.annul);

export default router;