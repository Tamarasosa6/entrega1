import {
  USER_ROLES,
  PRODUCT_STATUS,
  ORDER_STATUS,
  ORDER_PRIORITY,
  DELIVERY_STATUS,
  MOCK_ENTITIES,
  MOCK_CONFIG,
  LOG_LEVELS,
} from '../constants/index.js';
import { ERROR_CODES } from '../errors/error.dictionary.js';
import { schemaRef } from './helpers.js';

const values = (obj) => Object.values(obj);

const objectId = (description = 'Identificador de MongoDB (ObjectId).') => ({
  type: 'string',
  pattern: '^[0-9a-fA-F]{24}$',
  example: '64b0f3a2c9d4e5a1b2c3d4e5',
  description,
});

const timestamps = {
  createdAt: { type: 'string', format: 'date-time' },
  updatedAt: { type: 'string', format: 'date-time' },
};

// Schemas reutilizables. Los enums salen de las constantes del proyecto.
export const schemas = {
  // ---------- Entidades ----------
  User: {
    type: 'object',
    description: 'Usuario del sistema. Nunca incluye la contraseña.',
    properties: {
      _id: objectId(),
      name: { type: 'string', example: 'Ana Pérez' },
      email: { type: 'string', format: 'email', example: 'ana@mail.com' },
      role: { type: 'string', enum: values(USER_ROLES), description: 'USER = cliente, DRIVER = repartidor.' },
      ...timestamps,
    },
  },
  Product: {
    type: 'object',
    properties: {
      _id: objectId(),
      name: { type: 'string', example: 'Caja chica' },
      description: { type: 'string', example: '20x20' },
      price: { type: 'number', minimum: 0, example: 1500 },
      stock: { type: 'integer', minimum: 0, example: 10 },
      status: {
        type: 'string',
        enum: values(PRODUCT_STATUS),
        description: 'Se deriva del stock: con stock > 0 es AVAILABLE, si no OUT_OF_STOCK.',
      },
      ...timestamps,
    },
  },
  OrderItem: {
    type: 'object',
    required: ['name', 'quantity', 'unitPrice'],
    properties: {
      name: { type: 'string', example: 'Caja chica' },
      quantity: { type: 'integer', minimum: 1, example: 2 },
      unitPrice: { type: 'number', minimum: 0, example: 1500 },
    },
  },
  Order: {
    type: 'object',
    properties: {
      _id: objectId(),
      customer: objectId('Id del usuario (rol USER) que hizo el pedido.'),
      items: { type: 'array', minItems: 1, items: schemaRef('OrderItem') },
      total: { type: 'number', description: 'Suma de quantity × unitPrice de los ítems. Lo calcula el servidor.', example: 3000 },
      status: { type: 'string', enum: values(ORDER_STATUS) },
      priority: { type: 'string', enum: values(ORDER_PRIORITY) },
      shippingAddress: { type: 'string', example: 'Mitre 123, Córdoba' },
      ...timestamps,
    },
  },
  Delivery: {
    type: 'object',
    description: 'Entrega asociada a un pedido. Hay una entrega por pedido.',
    properties: {
      _id: objectId(),
      order: objectId('Id del pedido asociado.'),
      driver: {
        ...objectId('Id del repartidor (usuario con rol DRIVER).'),
        nullable: true,
        description: 'Id del repartidor (usuario con rol DRIVER). null mientras la entrega está PENDING.',
      },
      status: { type: 'string', enum: values(DELIVERY_STATUS) },
      address: { type: 'string', example: 'Mitre 123, Córdoba' },
      scheduledDate: { type: 'string', format: 'date-time' },
      deliveredAt: { type: 'string', format: 'date-time', nullable: true, description: 'Solo tiene valor cuando la entrega está DELIVERED.' },
      ...timestamps,
    },
  },

  // ---------- Bodies de entrada ----------
  ProductCreate: {
    type: 'object',
    required: ['name', 'price'],
    properties: {
      name: { type: 'string', example: 'Caja chica' },
      description: { type: 'string', example: '20x20' },
      price: { type: 'number', minimum: 0, example: 1500 },
      stock: { type: 'integer', minimum: 0, default: 0, example: 10 },
    },
  },
  ProductUpdate: {
    type: 'object',
    minProperties: 1,
    description: 'Al menos un campo. El estado no se envía: se recalcula a partir del stock.',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      price: { type: 'number', minimum: 0 },
      stock: { type: 'integer', minimum: 0 },
    },
  },
  UserCreate: {
    type: 'object',
    required: ['name', 'email', 'password'],
    properties: {
      name: { type: 'string', example: 'Ana Pérez' },
      email: { type: 'string', format: 'email', example: 'ana@mail.com' },
      password: { type: 'string', minLength: 6, example: 'secreto123' },
      role: { type: 'string', enum: values(USER_ROLES), default: USER_ROLES.USER },
    },
  },
  UserUpdate: {
    type: 'object',
    minProperties: 1,
    description: 'Al menos uno de estos campos. El email no se puede modificar.',
    properties: {
      name: { type: 'string' },
      password: { type: 'string', minLength: 6 },
      role: { type: 'string', enum: values(USER_ROLES) },
    },
  },
  OrderCreate: {
    type: 'object',
    required: ['customer', 'items', 'shippingAddress'],
    description: 'El total y el estado inicial (PENDING) los define el servidor.',
    properties: {
      customer: objectId('Id de un usuario existente con rol USER.'),
      items: { type: 'array', minItems: 1, items: schemaRef('OrderItem') },
      shippingAddress: { type: 'string', example: 'Mitre 123, Córdoba' },
      priority: { type: 'string', enum: values(ORDER_PRIORITY), default: ORDER_PRIORITY.NORMAL },
    },
  },
  OrderStatusUpdate: {
    type: 'object',
    required: ['status'],
    properties: { status: { type: 'string', enum: values(ORDER_STATUS) } },
  },
  DeliveryStatusUpdate: {
    type: 'object',
    required: ['status'],
    description:
      'PENDING no admite repartidor. ASSIGNED, IN_TRANSIT y DELIVERED requieren un repartidor: se envía en `driver` o ya debe estar asignado a la entrega.',
    properties: {
      status: { type: 'string', enum: values(DELIVERY_STATUS) },
      driver: objectId('Id de un usuario con rol DRIVER (opcional si la entrega ya tiene repartidor).'),
    },
  },

  // ---------- Respuestas ----------
  SuccessMessage: {
    type: 'object',
    description: 'Respuesta exitosa simple (por ejemplo, al eliminar).',
    properties: { message: { type: 'string', example: 'Usuario eliminado.' } },
  },
  ErrorResponse: {
    type: 'object',
    description: 'Estructura uniforme de todos los errores. La arma únicamente el middleware global de errores.',
    required: ['success', 'error'],
    properties: {
      success: { type: 'boolean', enum: [false], example: false },
      error: {
        type: 'object',
        required: ['code', 'message', 'status', 'details', 'path', 'method', 'timestamp'],
        properties: {
          code: { type: 'string', enum: values(ERROR_CODES), example: 'USER_NOT_FOUND', description: 'Código estable para identificar el error.' },
          message: { type: 'string', example: 'No existe un usuario con id "64b0f3a2c9d4e5a1b2c3d4e5".' },
          status: { type: 'integer', example: 404 },
          details: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
            description: 'Información adicional según el error (por ejemplo, `errors` en VALIDATION_ERROR). null si no hay.',
          },
          path: { type: 'string', example: '/api/users/64b0f3a2c9d4e5a1b2c3d4e5' },
          method: { type: 'string', example: 'GET' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    },
  },

  // ---------- Mocks (datos simulados, sin guardar) ----------
  MockUser: {
    type: 'object',
    description: 'Usuario simulado. Tiene la misma forma que un usuario real, sin contraseña ni fechas.',
    properties: {
      _id: objectId(),
      name: { type: 'string', example: 'Ana Pérez' },
      email: { type: 'string', example: 'ana.perez4821@test.com' },
      role: { type: 'string', enum: values(USER_ROLES) },
    },
  },
  MockOrder: {
    type: 'object',
    description: 'Pedido simulado.',
    properties: {
      _id: objectId(),
      customer: objectId('Id de un cliente (rol USER) simulado.'),
      items: { type: 'array', items: schemaRef('OrderItem') },
      total: { type: 'number' },
      status: { type: 'string', enum: values(ORDER_STATUS) },
      priority: { type: 'string', enum: values(ORDER_PRIORITY) },
      shippingAddress: { type: 'string' },
    },
  },
  MockDelivery: {
    type: 'object',
    description:
      'Entrega simulada. Los pedidos CANCELLED no tienen entrega; las entregas PENDING no tienen repartidor.',
    properties: {
      _id: objectId(),
      order: objectId('Id del pedido simulado asociado.'),
      driver: { ...objectId('Id de un repartidor simulado.'), nullable: true },
      status: { type: 'string', enum: values(DELIVERY_STATUS) },
      address: { type: 'string' },
      scheduledDate: { type: 'string', format: 'date-time' },
      deliveredAt: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  MockDataset: {
    type: 'object',
    description: 'Conjunto consistente: los pedidos apuntan a `users` y las entregas a esos pedidos y a `drivers`.',
    properties: {
      users: { type: 'array', items: schemaRef('MockUser') },
      drivers: { type: 'array', items: schemaRef('MockUser') },
      orders: { type: 'array', items: schemaRef('MockOrder') },
      deliveries: { type: 'array', items: schemaRef('MockDelivery') },
    },
  },
  SeedResult: {
    type: 'object',
    description: 'Resultado de cargar una sola colección (users, drivers, orders o deliveries).',
    properties: {
      insertados: { type: 'integer', example: 10 },
      coleccion: { type: 'string', enum: ['users', 'orders', 'deliveries'], example: 'users' },
    },
  },
  SeedAllResult: {
    type: 'object',
    description: 'Resultado de entity=all.',
    properties: {
      insertados: { type: 'integer', example: 33 },
      colecciones: {
        type: 'object',
        properties: {
          users: { type: 'integer', example: 10 },
          orders: { type: 'integer', example: 12 },
          deliveries: { type: 'integer', example: 11 },
        },
      },
    },
  },

  // ---------- Logger ----------
  LoggerTestResult: {
    type: 'object',
    properties: {
      message: { type: 'string', example: 'Se emitió un mensaje de prueba por cada nivel de log.' },
      emitted: { type: 'array', items: { type: 'string', enum: values(LOG_LEVELS) }, example: ['debug', 'http', 'info', 'warning', 'error', 'fatal'] },
      activeLevel: { type: 'string', enum: values(LOG_LEVELS), example: 'debug' },
      environment: { type: 'string', example: 'development' },
      note: { type: 'string' },
    },
  },
};

// Parámetros reutilizables
export const parameters = {
  IdParam: {
    name: 'id',
    in: 'path',
    required: true,
    description: 'Identificador de MongoDB (24 caracteres hexadecimales).',
    schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$', example: '64b0f3a2c9d4e5a1b2c3d4e5' },
  },
  QtyParam: {
    name: 'qty',
    in: 'query',
    required: false,
    description: `Cantidad de registros: entero entre ${MOCK_CONFIG.MIN_QTY} y ${MOCK_CONFIG.MAX_QTY} (por defecto ${MOCK_CONFIG.DEFAULT_QTY}). Fuera de rango o no numérico responde 400 INVALID_QUANTITY; negativo, 400 NEGATIVE_VALUE.`,
    schema: { type: 'integer', minimum: MOCK_CONFIG.MIN_QTY, maximum: MOCK_CONFIG.MAX_QTY, default: MOCK_CONFIG.DEFAULT_QTY },
  },
  SeedEntityParam: {
    name: 'entity',
    in: 'query',
    required: false,
    description: 'Qué cargar. `all` genera usuarios, repartidores, pedidos y entregas relacionados entre sí.',
    schema: { type: 'string', enum: values(MOCK_ENTITIES), default: MOCK_ENTITIES.USERS },
  },
};
