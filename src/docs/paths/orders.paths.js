import {
  ORDER_STATUS,
  ORDER_PRIORITY,
  DELIVERY_STATUS,
  USER_ROLES,
} from '../../constants/index.js';
import {
  InvalidIdError,
  InvalidJsonError,
  InvalidStatusError,
  InvalidPriorityError,
  NegativeValueError,
  OrderNotFoundError,
  DeliveryNotFoundError,
  UserNotFoundError,
  RequestValidationError,
} from '../../errors/domain.errors.js';
import {
  ID_EXAMPLE,
  schemaRef,
  paramRef,
  jsonContent,
  okResponse,
  errorResponses,
} from '../helpers.js';

const invalidId = new InvalidIdError('abc');
const invalidJson = new InvalidJsonError();
const OTHER_ID = '64b0f3a2c9d4e5a1b2c3d4e6';

const exampleOrder = {
  _id: ID_EXAMPLE,
  customer: OTHER_ID,
  items: [{ name: 'Caja chica', quantity: 2, unitPrice: 1500 }],
  total: 3000,
  status: ORDER_STATUS.PENDING,
  priority: ORDER_PRIORITY.HIGH,
  shippingAddress: 'Mitre 123, Córdoba',
  createdAt: '2026-10-24T18:00:00.000Z',
  updatedAt: '2026-10-24T18:00:00.000Z',
};

const exampleDelivery = {
  _id: ID_EXAMPLE,
  order: OTHER_ID,
  driver: null,
  status: DELIVERY_STATUS.PENDING,
  address: 'Mitre 123, Córdoba',
  scheduledDate: '2026-10-25T15:00:00.000Z',
  deliveredAt: null,
  createdAt: '2026-10-24T18:00:00.000Z',
  updatedAt: '2026-10-24T18:00:00.000Z',
};

const orderValidation = new RequestValidationError([
  { field: 'items', message: 'Debe haber al menos un ítem.' },
  { field: 'shippingAddress', message: 'La dirección de envío es obligatoria.' },
]);
const customerNotClient = new RequestValidationError([
  { field: 'customer', message: `El usuario debe tener rol ${USER_ROLES.USER} para hacer pedidos.` },
]);
const statusRequired = new RequestValidationError([
  { field: 'status', message: 'El estado es obligatorio.' },
]);

// ============================== Orders ==============================

export const ordersPaths = {
  '/api/orders': {
    get: {
      tags: ['Orders'],
      summary: 'Listar pedidos',
      description: 'Devuelve hasta 500 pedidos, del más reciente al más antiguo. Útil para ver los datos cargados con /api/mocks/seed.',
      operationId: 'listOrders',
      responses: {
        200: okResponse('Lista de pedidos.', { type: 'array', items: schemaRef('Order') }, [exampleOrder]),
        ...errorResponses({ method: 'GET', path: '/api/orders' }),
      },
    },
    post: {
      tags: ['Orders'],
      summary: 'Crear un pedido',
      description:
        'El cliente debe existir y tener rol USER. El total (suma de quantity × unitPrice) y el estado inicial (PENDING) los define el servidor. Si no se indica prioridad, se usa NORMAL.',
      operationId: 'createOrder',
      requestBody: {
        required: true,
        content: jsonContent(schemaRef('OrderCreate'), {
          customer: OTHER_ID,
          items: [{ name: 'Caja chica', quantity: 2, unitPrice: 1500 }],
          shippingAddress: 'Mitre 123, Córdoba',
          priority: 'HIGH',
        }),
      },
      responses: {
        201: okResponse('Pedido creado.', schemaRef('Order'), exampleOrder),
        ...errorResponses({
          method: 'POST',
          path: '/api/orders',
          errors: {
            400: [
              orderValidation,
              ['VALIDATION_ERROR (cliente sin rol USER)', customerNotClient],
              invalidId,
              new NegativeValueError('items[0].unitPrice', -5),
              new InvalidPriorityError('MAX', Object.values(ORDER_PRIORITY)),
              invalidJson,
            ],
            404: [new UserNotFoundError(OTHER_ID)],
          },
        }),
      },
    },
  },
  '/api/orders/{id}': {
    parameters: [paramRef('IdParam')],
    get: {
      tags: ['Orders'],
      summary: 'Obtener un pedido por id',
      operationId: 'getOrder',
      responses: {
        200: okResponse('Pedido encontrado.', schemaRef('Order'), exampleOrder),
        ...errorResponses({
          method: 'GET',
          path: `/api/orders/${ID_EXAMPLE}`,
          errors: { 400: [invalidId], 404: [new OrderNotFoundError(ID_EXAMPLE)] },
        }),
      },
    },
  },
  '/api/orders/{id}/status': {
    parameters: [paramRef('IdParam')],
    patch: {
      tags: ['Orders'],
      summary: 'Cambiar el estado de un pedido',
      description: `Estados permitidos: ${Object.values(ORDER_STATUS).join(', ')}.`,
      operationId: 'updateOrderStatus',
      requestBody: {
        required: true,
        content: jsonContent(schemaRef('OrderStatusUpdate'), { status: 'IN_PROGRESS' }),
      },
      responses: {
        200: okResponse('Pedido con el estado actualizado.', schemaRef('Order'), { ...exampleOrder, status: ORDER_STATUS.IN_PROGRESS }),
        ...errorResponses({
          method: 'PATCH',
          path: `/api/orders/${ID_EXAMPLE}/status`,
          errors: {
            400: [
              invalidId,
              ['VALIDATION_ERROR', statusRequired],
              new InvalidStatusError('ENVIADO', Object.values(ORDER_STATUS)),
              invalidJson,
            ],
            404: [new OrderNotFoundError(ID_EXAMPLE)],
          },
        }),
      },
    },
  },
};

// ============================== Deliveries ==============================

export const deliveriesPaths = {
  '/api/deliveries': {
    get: {
      tags: ['Deliveries'],
      summary: 'Listar entregas',
      description: 'Devuelve hasta 500 entregas, de la más reciente a la más antigua. Las entregas se generan con /api/mocks/seed (entity=deliveries o all).',
      operationId: 'listDeliveries',
      responses: {
        200: okResponse('Lista de entregas.', { type: 'array', items: schemaRef('Delivery') }, [exampleDelivery]),
        ...errorResponses({ method: 'GET', path: '/api/deliveries' }),
      },
    },
  },
  '/api/deliveries/{id}': {
    parameters: [paramRef('IdParam')],
    get: {
      tags: ['Deliveries'],
      summary: 'Obtener una entrega por id',
      operationId: 'getDelivery',
      responses: {
        200: okResponse('Entrega encontrada.', schemaRef('Delivery'), exampleDelivery),
        ...errorResponses({
          method: 'GET',
          path: `/api/deliveries/${ID_EXAMPLE}`,
          errors: { 400: [invalidId], 404: [new DeliveryNotFoundError(ID_EXAMPLE)] },
        }),
      },
    },
  },
  '/api/deliveries/{id}/status': {
    parameters: [paramRef('IdParam')],
    patch: {
      tags: ['Deliveries'],
      summary: 'Cambiar el estado de una entrega',
      description:
        `Estados permitidos: ${Object.values(DELIVERY_STATUS).join(', ')}. ` +
        'PENDING no admite repartidor. ASSIGNED, IN_TRANSIT y DELIVERED requieren un repartidor (usuario con rol DRIVER): se envía en `driver` o ya debe estar asignado. DELIVERED registra `deliveredAt`.',
      operationId: 'updateDeliveryStatus',
      requestBody: {
        required: true,
        content: jsonContent(schemaRef('DeliveryStatusUpdate'), { status: 'ASSIGNED', driver: OTHER_ID }),
      },
      responses: {
        200: okResponse('Entrega con el estado actualizado.', schemaRef('Delivery'), {
          ...exampleDelivery,
          status: DELIVERY_STATUS.ASSIGNED,
          driver: OTHER_ID,
        }),
        ...errorResponses({
          method: 'PATCH',
          path: `/api/deliveries/${ID_EXAMPLE}/status`,
          errors: {
            400: [
              invalidId,
              ['VALIDATION_ERROR', new RequestValidationError([
                { field: 'driver', message: `Se requiere un repartidor para el estado ${DELIVERY_STATUS.ASSIGNED}.` },
              ])],
              new InvalidStatusError('ENVIADA', Object.values(DELIVERY_STATUS)),
              invalidJson,
            ],
            404: [
              new DeliveryNotFoundError(ID_EXAMPLE),
              ['USER_NOT_FOUND (repartidor)', new UserNotFoundError(OTHER_ID)],
            ],
          },
        }),
      },
    },
  },
};
