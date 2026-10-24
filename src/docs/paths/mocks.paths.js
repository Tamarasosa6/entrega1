import { USER_ROLES, ORDER_STATUS, ORDER_PRIORITY, MOCK_ENTITIES } from '../../constants/index.js';
import {
  InvalidQuantityError,
  NegativeValueError,
  InvalidRoleError,
  InvalidStatusError,
  InvalidPriorityError,
  InvalidMockEntityError,
  MockDependencyMissingError,
  SeedDisabledError,
  MockSeedError,
  LoggerTestDisabledError,
} from '../../errors/domain.errors.js';
import { schemaRef, paramRef, okResponse, errorResponses } from '../helpers.js';

const OBJECT_ID = '64b0f3a2c9d4e5a1b2c3d4e5';

// Errores de `qty` (comunes a todos los endpoints de mocks)
const outOfRange = ['INVALID_QUANTITY (fuera de rango)', new InvalidQuantityError({ received: '0', min: 1, max: 100, reason: 'OUT_OF_RANGE' })];
const notANumber = ['INVALID_QUANTITY (no numérica)', new InvalidQuantityError({ received: 'abc', min: 1, max: 100, reason: 'NOT_A_NUMBER' })];
const notAnInteger = ['INVALID_QUANTITY (decimal)', new InvalidQuantityError({ received: '2.5', min: 1, max: 100, reason: 'NOT_AN_INTEGER' })];
const negativeQty = new NegativeValueError('qty', -5);
const qtyErrors = [outOfRange, notANumber, notAnInteger, negativeQty];

const exampleMockUsers = [
  { _id: OBJECT_ID, name: 'Ana Pérez', email: 'ana.perez4821@test.com', role: USER_ROLES.USER },
  { _id: '64b0f3a2c9d4e5a1b2c3d4e6', name: 'Luis Gómez', email: 'luis.gomez7305@test.com', role: USER_ROLES.DRIVER },
];

const exampleMockOrder = {
  _id: OBJECT_ID,
  customer: '64b0f3a2c9d4e5a1b2c3d4e7',
  items: [{ name: 'Libros', quantity: 1, unitPrice: 13521 }],
  total: 13521,
  status: ORDER_STATUS.PENDING,
  priority: ORDER_PRIORITY.NORMAL,
  shippingAddress: 'Córdoba 3519, La Plata',
};

const exampleMockDelivery = {
  _id: '64b0f3a2c9d4e5a1b2c3d4e8',
  order: OBJECT_ID,
  driver: null,
  status: 'PENDING',
  address: 'Córdoba 3519, La Plata',
  scheduledDate: '2026-10-25T15:00:00.000Z',
  deliveredAt: null,
};

const get = (summary, operationId, description, parameters, responseSchema, example, errors, path) => ({
  tags: ['Mocks'],
  summary,
  description,
  operationId,
  parameters,
  responses: {
    200: okResponse('Datos simulados (no se guardan en la base).', responseSchema, example),
    ...errorResponses({ method: 'GET', path, errors: { 400: errors }, db: false }),
  },
});

// ============================== Mocks ==============================

export const mocksPaths = {
  '/api/mocks/users': {
    get: get(
      'Obtener usuarios simulados',
      'getMockUsers',
      'Genera usuarios simulados con roles válidos (USER, DRIVER o ADMIN) **sin guardarlos** en la base. Cada llamada devuelve datos distintos.',
      [
        paramRef('QtyParam'),
        {
          name: 'role',
          in: 'query',
          required: false,
          description: 'Fuerza el rol de todos los usuarios generados. Si se omite, se mezclan.',
          schema: { type: 'string', enum: Object.values(USER_ROLES) },
        },
      ],
      { type: 'array', items: schemaRef('MockUser') },
      exampleMockUsers,
      [...qtyErrors, new InvalidRoleError('cliente', Object.values(USER_ROLES))],
      '/api/mocks/users?qty=0'
    ),
  },
  '/api/mocks/drivers': {
    get: get(
      'Obtener repartidores simulados',
      'getMockDrivers',
      'Genera usuarios con rol DRIVER (repartidores) sin guardarlos.',
      [paramRef('QtyParam')],
      { type: 'array', items: schemaRef('MockUser') },
      [exampleMockUsers[1]],
      qtyErrors,
      '/api/mocks/drivers?qty=0'
    ),
  },
  '/api/mocks/orders': {
    get: get(
      'Obtener pedidos simulados',
      'getMockOrders',
      'Genera pedidos con estados y prioridades válidos, asociados a clientes (rol USER) simulados, sin guardarlos. El total es la suma de sus ítems.',
      [
        paramRef('QtyParam'),
        {
          name: 'status',
          in: 'query',
          required: false,
          description: 'Fuerza el estado de todos los pedidos generados.',
          schema: { type: 'string', enum: Object.values(ORDER_STATUS) },
        },
        {
          name: 'priority',
          in: 'query',
          required: false,
          description: 'Fuerza la prioridad de todos los pedidos generados.',
          schema: { type: 'string', enum: Object.values(ORDER_PRIORITY) },
        },
      ],
      { type: 'array', items: schemaRef('MockOrder') },
      [exampleMockOrder],
      [
        ...qtyErrors,
        new InvalidStatusError('ENVIADO', Object.values(ORDER_STATUS)),
        new InvalidPriorityError('MAX', Object.values(ORDER_PRIORITY)),
      ],
      '/api/mocks/orders?qty=0'
    ),
  },
  '/api/mocks/deliveries': {
    get: get(
      'Obtener entregas simuladas',
      'getMockDeliveries',
      'Genera entregas asociadas a pedidos simulados (los pedidos CANCELLED no tienen entrega) y, cuando el estado lo requiere, a repartidores simulados. No se guardan.',
      [paramRef('QtyParam')],
      { type: 'array', items: schemaRef('MockDelivery') },
      [exampleMockDelivery],
      qtyErrors,
      '/api/mocks/deliveries?qty=0'
    ),
  },
  '/api/mocks/dataset': {
    get: get(
      'Obtener un conjunto completo y consistente',
      'getMockDataset',
      'Devuelve usuarios, repartidores, pedidos y entregas relacionados entre sí, sin guardarlos. `qty` es la cantidad de pedidos.',
      [paramRef('QtyParam')],
      schemaRef('MockDataset'),
      {
        users: [exampleMockUsers[0]],
        drivers: [exampleMockUsers[1]],
        orders: [exampleMockOrder],
        deliveries: [exampleMockDelivery],
      },
      qtyErrors,
      '/api/mocks/dataset?qty=0'
    ),
  },
  '/api/mocks/seed': {
    post: {
      tags: ['Mocks'],
      summary: 'Cargar datos de prueba en MongoDB',
      description:
        'Inserta datos simulados en la base. **No recibe body**: la cantidad y la entidad se indican por query (`qty`, `entity`).\n\n' +
        '- `users` (por defecto) y `drivers`: no necesitan datos previos.\n' +
        '- `orders`: se asignan a clientes (rol USER) que **ya existen** en la base.\n' +
        '- `deliveries`: se crean para pedidos existentes que todavía no tienen entrega (los cancelados no tienen).\n' +
        '- `all`: genera un conjunto completo y consistente (usuarios, repartidores, pedidos y entregas).\n\n' +
        'Está deshabilitado con `NODE_ENV=production`. Todos los usuarios de prueba tienen la contraseña `Test1234`.',
      operationId: 'seedMocks',
      parameters: [paramRef('QtyParam'), paramRef('SeedEntityParam')],
      responses: {
        201: {
          description: 'Datos insertados.',
          content: {
            'application/json': {
              schema: { oneOf: [schemaRef('SeedResult'), schemaRef('SeedAllResult')] },
              examples: {
                coleccion: { summary: 'entity=users | drivers | orders | deliveries', value: { insertados: 10, coleccion: 'users' } },
                all: {
                  summary: 'entity=all',
                  value: { insertados: 33, colecciones: { users: 10, orders: 12, deliveries: 11 } },
                },
              },
            },
          },
        },
        ...errorResponses({
          method: 'POST',
          path: '/api/mocks/seed?qty=0',
          errors: {
            400: [...qtyErrors, new InvalidMockEntityError('foo', Object.values(MOCK_ENTITIES))],
            403: [new SeedDisabledError()],
            409: [new MockDependencyMissingError('orders', 'clientes (role USER)', 'Cargá users primero o usá entity=all.')],
            500: [new MockSeedError('users', Object.assign(new Error('E11000 duplicate key'), { code: 11000 }))],
          },
        }),
      },
    },
  },
};

// ============================== Logger ==============================

export const loggerPaths = {
  '/api/logger/test': {
    get: {
      tags: ['Logger'],
      summary: 'Probar el logger',
      description:
        '**Herramienta interna de validación, no es una funcionalidad de negocio.** Emite un mensaje de prueba por cada nivel (debug, http, info, warning, error y fatal) para comprobar que aparecen en la consola y en los archivos de `logs/`. ' +
        'Según el nivel activo, algunos no se muestran (por ejemplo, debug con LOG_LEVEL=info). Está deshabilitado con `NODE_ENV=production`.',
      operationId: 'testLogger',
      responses: {
        200: okResponse('Mensajes emitidos.', schemaRef('LoggerTestResult'), {
          message: 'Se emitió un mensaje de prueba por cada nivel de log.',
          emitted: ['debug', 'http', 'info', 'warning', 'error', 'fatal'],
          activeLevel: 'debug',
          environment: 'development',
          note: 'En consola y en combined-*.log aparecen los niveles desde el activo hacia los más severos; error-*.log solo guarda error y fatal.',
        }),
        ...errorResponses({
          method: 'GET',
          path: '/api/logger/test',
          errors: { 403: [new LoggerTestDisabledError()] },
          db: false,
        }),
      },
    },
  },
};

// ============================== Health ==============================

export const healthPaths = {
  '/health': {
    get: {
      tags: ['Health'],
      summary: 'Estado del servidor',
      description: 'Verifica que el servidor responde. No consulta la base de datos.',
      operationId: 'health',
      responses: {
        200: {
          description: 'El servidor está activo.',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } },
              example: { status: 'ok' },
            },
          },
        },
      },
    },
  },
};
