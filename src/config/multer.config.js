import multer from 'multer';
import path from 'path';
import fs from 'fs';
import logger from '../logger/index.js';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'uploads/general';
    if (req.baseUrl.includes('/users')) {
      folder = 'uploads/documents';
    } else if (req.baseUrl.includes('/orders')) {
      folder = 'uploads/receipts';
    }
    ensureDir(folder);
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    logger.warn(`Intento de subir tipo de archivo no permitido: ${file.mimetype}`);
    const err = new Error(`Tipo de archivo no permitido. Tipos aceptados: ${ALLOWED_MIME_TYPES.join(', ')}`);
    err.code = 'INVALID_FILE_TYPE';
    err.status = 400;
    return cb(err, false);
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter
});

export const uploadSingle = (fieldname) => {
  const multerMiddleware = upload.single(fieldname);
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          err.status = 400;
        }
        return next(err);
      }
      if (!req.file) {
        const fileErr = new Error('Es obligatorio adjuntar un archivo.');
        fileErr.code = 'FILE_MISSING';
        fileErr.status = 400;
        return next(fileErr);
      }
      next();
    });
  };
};
