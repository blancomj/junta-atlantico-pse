import { Router } from 'express';
import multer from 'multer';
import batchPaymentController from '../controllers/batch-payment.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';

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

// All routes require authentication
router.use(authenticate);

router.post('/upload', upload.single('file'), batchPaymentController.upload);
router.post('/pse-callback', batchPaymentController.pseCallback);
router.post('/', batchPaymentController.create);
router.get('/', batchPaymentController.list);
router.get('/search-beneficiary', batchPaymentController.searchBeneficiary);
router.get('/:id', batchPaymentController.detail);
router.post('/:id/pay', batchPaymentController.pay);
router.post('/:id/annul', batchPaymentController.annul);

export default router;