import config from '../config/index.js';
import { HTTP_STATUS } from '../constants/index.js';

// Manejo centralizado de errores. No importa Mongoose: detecta sus errores por nombre/código.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode;
  let message = err.message;

  if (!statusCode) {
    if (err.name === 'ValidationError') {
      statusCode = HTTP_STATUS.BAD_REQUEST;
    } else if (err.name === 'CastError') {
      statusCode = HTTP_STATUS.BAD_REQUEST;
      message = 'Identificador inválido.';
    } else if (err.code === 11000) {
      statusCode = HTTP_STATUS.CONFLICT;
      message = 'Ya existe un registro con ese valor único.';
    } else {
      statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
      message = 'Error interno del servidor.';
      console.error(err);
    }
  }

  res.status(statusCode).json({
    error: message,
    ...(config.isProduction ? {} : { stack: err.stack }),
  });
}

export function notFoundHandler(req, res) {
  res.status(HTTP_STATUS.NOT_FOUND).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}
