import { Router } from 'express';
import { MockController } from '../controllers/mock.controller.js';

const router = Router();

// Datos simulados (no se guardan)
router.get('/users', MockController.getUsers);
router.get('/drivers', MockController.getDrivers);
router.get('/orders', MockController.getOrders);
router.get('/deliveries', MockController.getDeliveries);
router.get('/dataset', MockController.getDataset);

// Carga de datos de prueba en MongoDB
router.post('/seed', MockController.seed);

export default router;
