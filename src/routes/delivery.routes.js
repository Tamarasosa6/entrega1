import { Router } from 'express';
import { DeliveryController } from '../controllers/delivery.controller.js';

const router = Router();

router.get('/', DeliveryController.getAll);
router.get('/:id', DeliveryController.getById);
router.patch('/:id/status', DeliveryController.updateStatus);

export default router;
