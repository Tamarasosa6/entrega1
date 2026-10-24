import { Router } from 'express';
import { LoggerController } from '../controllers/logger.controller.js';

const router = Router();

// Herramienta interna para verificar que el logger funciona
router.get('/test', LoggerController.test);

export default router;
