// Configuración centralizada de Multer. Los routers solo usan `uploadSingle(campo)`.
// Define: tamaño máximo, tipos aceptados, nombre del archivo guardado, carpetas y
// traducción de los errores de Multer al sistema de errores del proyecto.
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { UPLOAD_CONFIG } from '../constants/index.js';
import { AppError } from '../errors/AppError.js';
import {
  InvalidFileTypeError,
  FileTooLargeError,
  UnexpectedFileFieldError,
  InvalidUploadError,
} from '../errors/domain.errors.js';
import logger from '../logger/index.js';

export const MAX_FILE_SIZE = UPLOAD_CONFIG.MAX_FILE_SIZE;
export const ALLOWED_MIME_TYPES = Object.keys(UPLOAD_CONFIG.ALLOWED_TYPES);

// Extensión en minúsculas, sin depender de cómo la haya escrito el cliente.
export const extensionOf = (originalName = '') => path.extname(String(originalName)).toLowerCase();

// El tipo MIME tiene que estar permitido Y la extensión tiene que corresponder a ese tipo.
export function isAllowedFile(mimeType, originalName) {
  const extensions = UPLOAD_CONFIG.ALLOWED_TYPES[mimeType];
  return Boolean(extensions) && extensions.includes(extensionOf(originalName));
}

// Nombre con el que se guarda el archivo: nunca se usa el nombre original (evita colisiones
// y rutas manipuladas); solo se conserva la extensión, que ya fue validada.
export function buildStoredName(fieldName, originalName) {
  return `${fieldName}-${Date.now()}-${randomUUID()}${extensionOf(originalName)}`;
}

function fileFilter(req, file, cb) {
  if (!isAllowedFile(file.mimetype, file.originalname)) {
    logger.warning('Intento de subir un tipo de archivo no permitido', {
      mimeType: file.mimetype,
      originalName: file.originalname,
      field: file.fieldname,
      method: req.method,
      path: req.originalUrl,
    });
    const received = `${file.mimetype}, ${extensionOf(file.originalname) || 'sin extensión'}`;
    return cb(new InvalidFileTypeError(received, ALLOWED_MIME_TYPES));
  }
  return cb(null, true);
}

// El archivo se recibe en memoria (límite de 5 MB) y se escribe en disco recién cuando el
// resto de las validaciones pasó (ver UploadService): así no quedan archivos huérfanos.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

// Convierte cualquier error de la etapa de carga en un AppError.
function toUploadError(error, expectedField) {
  if (error instanceof AppError) return error;
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') return new FileTooLargeError(MAX_FILE_SIZE);
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return new UnexpectedFileFieldError(error.field, expectedField);
    }
  }
  // Formulario multipart malformado u otros límites de Multer
  return new InvalidUploadError();
}

// Middleware para recibir UN archivo en el campo indicado.
// Deja el archivo en req.file; si hay un problema, lo deriva al manejador global de errores.
export function uploadSingle(fieldName) {
  const receive = upload.single(fieldName);
  return (req, res, next) => {
    receive(req, res, (error) => {
      if (error) return next(toUploadError(error, fieldName));
      return next();
    });
  };
}
