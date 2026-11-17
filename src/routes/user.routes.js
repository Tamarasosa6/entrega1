import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { uploadSingle } from '../config/upload.config.js';
import { UPLOAD_FIELDS } from '../constants/index.js';

const router = Router();

router.get('/', UserController.getAll);
router.get('/:id', UserController.getById);
router.post('/', UserController.create);
router.put('/:id', UserController.update);
router.delete('/:id', UserController.delete);
router.post('/:id/documents', uploadSingle(UPLOAD_FIELDS.USER_DOCUMENT), UserController.uploadDocument);

export default router;
