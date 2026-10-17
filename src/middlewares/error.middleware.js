import { toAppError } from '../errors/error.normalizer.js';
import { RouteNotFoundError } from '../errors/domain.errors.js';

// Rutas que no existen: se derivan al manejador global como cualquier error.
export function notFoundHandler(req, res, next) {
  next(new RouteNotFoundError(req.method, req.originalUrl));
}

// Único lugar de la API que arma respuestas de error.
// Estructura uniforme:
// { success: false, error: { code, message, status, details, path, method, timestamp } }
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const appError = toAppError(err);

  // Los errores de servidor se registran con su causa original; el cliente no la ve.
  if (appError.statusCode >= 500) {
    console.error(`[Error] ${req.method} ${req.originalUrl}`, appError.cause ?? appError);
  }

  return res.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      status: appError.statusCode,
      details: appError.details ?? null,
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
    },
  });
}
