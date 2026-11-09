import { Router } from 'express';
import { uploadSingle } from '../config/multer.config.js';

const router = Router();

router.get('/', (req, res) => res.json({ success: true, payload: [] }));

router.post('/:id/documents', uploadSingle('document'), (req, res) => {
  const { docType } = req.body;
  const allowedDocTypes = ['DNI', 'DRIVER_LICENSE', 'TAX_ID', 'PROOF_OF_ADDRESS'];
  
  if (docType && !allowedDocTypes.includes(docType)) {
    const err = new Error(`Tipo de documento inválido "${docType}". Valores permitidos: ${allowedDocTypes.join(', ')}`);
    err.code = 'INVALID_DOC_TYPE';
    err.status = 400;
    throw err;
  }

  res.status(200).json({
    success: true,
    message: 'Documento subido correctamente',
    payload: {
      userId: req.params.id,
      document: {
        filename: req.file.filename,
        docType: docType || 'DNI',
        originalName: req.file.originalname
      }
    }
  });
});

export default router;
