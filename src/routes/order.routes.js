import { Router } from 'express';
import { uploadSingle } from '../config/multer.config.js';

const router = Router();

router.post('/:id/receipt', uploadSingle('receipt'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Comprobante subido correctamente',
    payload: {
      entityId: req.params.id,
      receipt: {
        filename: req.file.filename,
        originalName: req.file.originalname
      }
    }
  });
});

export default router;
