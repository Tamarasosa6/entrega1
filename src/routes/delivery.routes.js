import { Router } from 'express';
import { DeliveryController } from '../controllers/delivery.controller.js';
import { uploadSingle } from '../config/upload.config.js';
import { UPLOAD_FIELDS } from '../constants/index.js';

const router = Router();

router.get('/', DeliveryController.getAll);
router.get('/:id', DeliveryController.getById);
router.patch('/:id/status', DeliveryController.updateStatus);
router.post('/:id/receipts', uploadSingle(UPLOAD_FIELDS.RECEIPT), DeliveryController.uploadReceipt);

export default router;
