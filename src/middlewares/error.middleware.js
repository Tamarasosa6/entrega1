import { toAppError } from '../errors/error.normalizer.js';
import { RouteNotFoundError } from '../errors/domain.errors.js';
import { HTTP_STATUS } from '../constants/index.js';
import logger from '../logger/index.js';

// Rutas que no existen: se derivan al manejador global como cualquier error.
export function notFoundHandler(req, res, next) {
  next(new RouteNotFoundError(req.method, req.originalUrl));
}

// Registra el error con el nivel que corresponde:
// - esperados / de negocio (4xx): warning
// - fallas del servidor o de la base de datos (5xx): error, con stack y causa original
function logError(appError, req) {
  const meta = {
    code: appError.code,
    status: appError.statusCode,
    method: req.method,
    path: req.originalUrl,
  };

  if (appError.statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    const origin = appError.cause ?? appError;
    logger.error(`${appError.code}: ${appError.message}`, {
      ...meta,
      details: appError.details ?? undefined,
      cause: origin instanceof Error ? origin.message : String(origin),
      stack: origin instanceof Error ? origin.stack : undefined,
    });
    return;
  }

  logger.warning(`${appError.code}: ${appError.message}`, {
    ...meta,
    details: appError.details ?? undefined,
  });
}

// Único lugar de la API que arma respuestas de error.
// Estructura uniforme:
// { success: false, error: { code, message, status, details, path, method, timestamp } }
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const appError = toAppError(err);
  logError(appError, req);

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
