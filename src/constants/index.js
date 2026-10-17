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

export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
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
