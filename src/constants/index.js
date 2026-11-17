// Valores inmutables del dominio. Se usan en lugar de strings sueltos.

export const USER_ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  USER: 'USER', // cliente que hace pedidos
  DRIVER: 'DRIVER', // repartidor
});

export const PRODUCT_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
});

export const ORDER_STATUS = Object.freeze({
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
});

export const ORDER_PRIORITY = Object.freeze({
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
});

export const DELIVERY_STATUS = Object.freeze({
  PENDING: 'PENDING', // todavía sin repartidor
  ASSIGNED: 'ASSIGNED', // repartidor asignado
  IN_TRANSIT: 'IN_TRANSIT', // en camino
  DELIVERED: 'DELIVERED',
});

// Niveles de log, de más a menos severo (fatal = 0 ... debug = 5).
export const LOG_LEVELS = Object.freeze({
  FATAL: 'fatal',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  HTTP: 'http',
  DEBUG: 'debug',
});

// Nivel mínimo por defecto según NODE_ENV (se puede pisar con LOG_LEVEL).
export const DEFAULT_LOG_LEVEL_BY_ENV = Object.freeze({
  development: LOG_LEVELS.DEBUG,
  production: LOG_LEVELS.INFO,
  test: LOG_LEVELS.ERROR,
});

export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
});

// Entidades que se pueden generar / cargar desde /api/mocks
export const MOCK_ENTITIES = Object.freeze({
  USERS: 'users',
  DRIVERS: 'drivers',
  ORDERS: 'orders',
  DELIVERIES: 'deliveries',
  ALL: 'all',
});

// Límites y valores por defecto del módulo de mocking
export const MOCK_CONFIG = Object.freeze({
  MIN_QTY: 1,
  DEFAULT_QTY: 10,
  MAX_QTY: 100,
  PASSWORD: 'Test1234', // contraseña de todos los usuarios de prueba
  EMAIL_DOMAIN: 'test.com',
});

// ----- Carga de archivos (Multer) -----

// Tipos de documento que se pueden asociar a un usuario.
export const DOCUMENT_TYPES = Object.freeze({
  DNI: 'DNI',
  DRIVER_LICENSE: 'DRIVER_LICENSE',
  TAX_ID: 'TAX_ID',
  PROOF_OF_ADDRESS: 'PROOF_OF_ADDRESS',
  OTHER: 'OTHER',
});

// Tipo que se registra en los metadatos de los comprobantes de pedidos y entregas.
export const RECEIPT_DOCUMENT_TYPE = 'RECEIPT';

// Nombre del campo de archivo que espera cada endpoint (multipart/form-data).
export const UPLOAD_FIELDS = Object.freeze({
  USER_DOCUMENT: 'document',
  RECEIPT: 'receipt',
});

// Subcarpetas dentro de la carpeta de uploads.
export const UPLOAD_FOLDERS = Object.freeze({
  USER_DOCUMENTS: 'documents',
  DRIVER_LICENSES: 'licenses',
  RECEIPTS: 'receipts',
});

export const UPLOAD_CONFIG = Object.freeze({
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5 MB
  // Tipo MIME permitido → extensiones aceptadas para ese tipo
  ALLOWED_TYPES: Object.freeze({
    'application/pdf': Object.freeze(['.pdf']),
    'image/jpeg': Object.freeze(['.jpg', '.jpeg']),
    'image/png': Object.freeze(['.png']),
    'image/webp': Object.freeze(['.webp']),
  }),
});
