import { HTTP_STATUS } from '../constants/index.js';

// Códigos estables que ve el cliente en `error.code`.
export const ERROR_CODES = Object.freeze({
  // Genéricos
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_JSON: 'INVALID_JSON',
  INVALID_ID: 'INVALID_ID',
  NEGATIVE_VALUE: 'NEGATIVE_VALUE',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  DUPLICATE_KEY: 'DUPLICATE_KEY',
  DATABASE_UNAVAILABLE: 'DATABASE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  // Usuarios / productos / pedidos
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  INVALID_ROLE: 'INVALID_ROLE',
  INVALID_STATUS: 'INVALID_STATUS',
  INVALID_PRIORITY: 'INVALID_PRIORITY',
  // Mocks
  INVALID_QUANTITY: 'INVALID_QUANTITY',
  INVALID_MOCK_ENTITY: 'INVALID_MOCK_ENTITY',
  MOCK_DEPENDENCY_MISSING: 'MOCK_DEPENDENCY_MISSING',
  SEED_DISABLED: 'SEED_DISABLED',
  MOCK_SEED_FAILED: 'MOCK_SEED_FAILED',
});

// Motivos posibles de INVALID_QUANTITY (viajan en error.details.reason)
export const QUANTITY_REASONS = Object.freeze({
  NOT_A_NUMBER: 'NOT_A_NUMBER',
  NOT_AN_INTEGER: 'NOT_AN_INTEGER',
  OUT_OF_RANGE: 'OUT_OF_RANGE',
});

const list = (values) => (Array.isArray(values) ? values.join(', ') : String(values));

// Diccionario: para cada código, el status HTTP y el mensaje (texto fijo o
// función que recibe `details`). Es la única fuente de mensajes de error.
export const ERROR_DICTIONARY = Object.freeze({
  [ERROR_CODES.VALIDATION_ERROR]: {
    status: HTTP_STATUS.BAD_REQUEST,
    message: 'Los datos enviados no son válidos.',
  },
  [ERROR_CODES.INVALID_JSON]: {
    status: HTTP_STATUS.BAD_REQUEST,
    message: 'El cuerpo de la petición no es un JSON válido.',
  },
  [ERROR_CODES.INVALID_ID]: {
    status: HTTP_STATUS.BAD_REQUEST,
    message: (d) => `El identificador "${d.id}" no tiene un formato válido.`,
  },
  [ERROR_CODES.NEGATIVE_VALUE]: {
    status: HTTP_STATUS.BAD_REQUEST,
    message: (d) => `El valor de "${d.field}" no puede ser negativo (recibido: ${d.value}).`,
  },
  [ERROR_CODES.ROUTE_NOT_FOUND]: {
    status: HTTP_STATUS.NOT_FOUND,
    message: (d) => `Ruta no encontrada: ${d.method} ${d.path}`,
  },
  [ERROR_CODES.DUPLICATE_KEY]: {
    status: HTTP_STATUS.CONFLICT,
    message: 'Ya existe un registro con ese valor único.',
  },
  [ERROR_CODES.DATABASE_UNAVAILABLE]: {
    status: HTTP_STATUS.SERVICE_UNAVAILABLE,
    message: 'La base de datos no está disponible en este momento.',
  },
  [ERROR_CODES.INTERNAL_ERROR]: {
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: 'Error interno del servidor.',
  },
  [ERROR_CODES.USER_NOT_FOUND]: {
    status: HTTP_STATUS.NOT_FOUND,
    message: (d) => `No existe un usuario con id "${d.id}".`,
  },
  [ERROR_CODES.PRODUCT_NOT_FOUND]: {
    status: HTTP_STATUS.NOT_FOUND,
    message: (d) => `No existe un producto con id "${d.id}".`,
  },
  [ERROR_CODES.ORDER_NOT_FOUND]: {
    status: HTTP_STATUS.NOT_FOUND,
    message: (d) => `No existe un pedido con id "${d.id}".`,
  },
  [ERROR_CODES.EMAIL_ALREADY_EXISTS]: {
    status: HTTP_STATUS.CONFLICT,
    message: (d) => `Ya existe un usuario con el email "${d.email}".`,
  },
  [ERROR_CODES.INVALID_ROLE]: {
    status: HTTP_STATUS.BAD_REQUEST,
    message: (d) => `Rol inválido "${d.received}". Valores permitidos: ${list(d.allowed)}.`,
  },
  [ERROR_CODES.INVALID_STATUS]: {
    status: HTTP_STATUS.BAD_REQUEST,
    message: (d) => `Estado inválido "${d.received}". Valores permitidos: ${list(d.allowed)}.`,
  },
  [ERROR_CODES.INVALID_PRIORITY]: {
    status: HTTP_STATUS.BAD_REQUEST,
    message: (d) => `Prioridad inválida "${d.received}". Valores permitidos: ${list(d.allowed)}.`,
  },
  [ERROR_CODES.INVALID_QUANTITY]: {
    status: HTTP_STATUS.BAD_REQUEST,
    message: (d) =>
      `La cantidad "${d.received}" no es válida: debe ser un número entero entre ${d.min} y ${d.max}.`,
  },
  [ERROR_CODES.INVALID_MOCK_ENTITY]: {
    status: HTTP_STATUS.BAD_REQUEST,
    message: (d) => `Entidad inválida "${d.received}". Valores permitidos: ${list(d.allowed)}.`,
  },
  [ERROR_CODES.MOCK_DEPENDENCY_MISSING]: {
    status: HTTP_STATUS.CONFLICT,
    message: (d) =>
      `No se pueden generar ${d.entity}: faltan ${d.missing} en la base de datos. ${d.suggestion}`,
  },
  [ERROR_CODES.SEED_DISABLED]: {
    status: HTTP_STATUS.FORBIDDEN,
    message: 'La carga de datos de prueba está deshabilitada en producción.',
  },
  [ERROR_CODES.MOCK_SEED_FAILED]: {
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: (d) =>
      `No se pudo completar la carga de datos de prueba (${d.entity}). Puede haber quedado una carga parcial.`,
  },
});
