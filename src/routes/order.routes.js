import { Router } from 'express';
import { OrderController } from '../controllers/order.controller.js';
import { uploadSingle } from '../config/upload.config.js';
import { UPLOAD_FIELDS } from '../constants/index.js';

const router = Router();

router.get('/', OrderController.getAll);
router.get('/:id', OrderController.getById);
router.post('/', OrderController.create);
router.patch('/:id/status', OrderController.updateStatus);
router.post('/:id/receipts', uploadSingle(UPLOAD_FIELDS.RECEIPT), OrderController.uploadReceipt);

export default router;
