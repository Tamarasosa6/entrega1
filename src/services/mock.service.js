import bcrypt from 'bcryptjs';
import config from '../config/index.js';
import {
  USER_ROLES,
  ORDER_STATUS,
  ORDER_PRIORITY,
  DELIVERY_STATUS,
  MOCK_ENTITIES,
  MOCK_CONFIG,
  HTTP_STATUS,
} from '../constants/index.js';
import { AppError } from '../utils/AppError.js';
import {
  FIRST_NAMES,
  LAST_NAMES,
  STREETS,
  CITIES,
  ITEM_NAMES,
  pick,
  pickWeighted,
  randomBetween,
  randomObjectId,
  slug,
  daysFromNow,
} from '../utils/mockData.js';
import { UserRepository } from '../repositories/user.repository.js';
import { OrderRepository } from '../repositories/order.repository.js';
import { DeliveryRepository } from '../repositories/delivery.repository.js';

const BCRYPT_ROUNDS_FOR_MOCKS = 4; // bajo a propósito: son datos de prueba

// Reglas de negocio que enlazan el estado del pedido con el de su entrega.
// Un pedido CANCELLED no tiene entrega.
const DELIVERY_STATUS_BY_ORDER_STATUS = Object.freeze({
  [ORDER_STATUS.PENDING]: () => DELIVERY_STATUS.PENDING,
  [ORDER_STATUS.IN_PROGRESS]: () => pick([DELIVERY_STATUS.ASSIGNED, DELIVERY_STATUS.IN_TRANSIT]),
  [ORDER_STATUS.DELIVERED]: () => DELIVERY_STATUS.DELIVERED,
});

// ---------- Validación de parámetros ----------

function parseQty(value) {
  if (value === undefined || value === '') return MOCK_CONFIG.DEFAULT_QTY;
  const qty = Number(value);
  if (!Number.isInteger(qty) || qty < 1 || qty > MOCK_CONFIG.MAX_QTY) {
    throw new AppError(
      `qty debe ser un entero entre 1 y ${MOCK_CONFIG.MAX_QTY}.`,
      HTTP_STATUS.BAD_REQUEST
    );
  }
  return qty;
}

function parseRole(value) {
  if (value === undefined || value === '') return undefined;
  if (!Object.values(USER_ROLES).includes(value)) {
    throw new AppError(
      `role inválido. Valores permitidos: ${Object.values(USER_ROLES).join(', ')}.`,
      HTTP_STATUS.BAD_REQUEST
    );
  }
  return value;
}

function parseEntity(value) {
  const entity = value === undefined || value === '' ? MOCK_ENTITIES.USERS : value;
  if (!Object.values(MOCK_ENTITIES).includes(entity)) {
    throw new AppError(
      `entity inválida. Valores permitidos: ${Object.values(MOCK_ENTITIES).join(', ')}.`,
      HTTP_STATUS.BAD_REQUEST
    );
  }
  return entity;
}

function assertSeedAllowed() {
  if (config.isProduction) {
    throw new AppError(
      'La carga de datos de prueba está deshabilitada en producción.',
      HTTP_STATUS.FORBIDDEN
    );
  }
}

// ---------- Generadores (no tocan la base de datos) ----------

function pickUserRole() {
  return pickWeighted([
    [USER_ROLES.USER, 70],
    [USER_ROLES.DRIVER, 25],
    [USER_ROLES.ADMIN, 5],
  ]);
}

function buildUsers(qty, { role } = {}) {
  const usedEmails = new Set();

  return Array.from({ length: qty }, () => {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);

    let email;
    do {
      email = `${slug(firstName)}.${slug(lastName)}${randomBetween(1000, 9999)}@${MOCK_CONFIG.EMAIL_DOMAIN}`;
    } while (usedEmails.has(email));
    usedEmails.add(email);

    return {
      _id: randomObjectId(),
      name: `${firstName} ${lastName}`,
      email,
      role: role ?? pickUserRole(),
    };
  });
}

function buildAddress() {
  return `${pick(STREETS)} ${randomBetween(100, 4999)}, ${pick(CITIES)}`;
}

function buildOrder(customerId) {
  const items = Array.from({ length: randomBetween(1, 4) }, () => ({
    name: pick(ITEM_NAMES),
    quantity: randomBetween(1, 5),
    unitPrice: randomBetween(500, 20000),
  }));

  return {
    _id: randomObjectId(),
    customer: customerId,
    items,
    total: items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    status: pickWeighted([
      [ORDER_STATUS.PENDING, 30],
      [ORDER_STATUS.IN_PROGRESS, 25],
      [ORDER_STATUS.DELIVERED, 35],
      [ORDER_STATUS.CANCELLED, 10],
    ]),
    priority: pickWeighted([
      [ORDER_PRIORITY.LOW, 25],
      [ORDER_PRIORITY.NORMAL, 45],
      [ORDER_PRIORITY.HIGH, 20],
      [ORDER_PRIORITY.URGENT, 10],
    ]),
    shippingAddress: buildAddress(),
  };
}

// Una entrega por pedido (salvo cancelados). Solo las entregas que ya
// pasaron de PENDING tienen repartidor asignado.
function buildDeliveries(orders, drivers) {
  const deliveries = [];

  for (const order of orders) {
    const statusFor = DELIVERY_STATUS_BY_ORDER_STATUS[order.status];
    if (!statusFor) continue; // pedido cancelado: sin entrega

    const status = statusFor();
    const needsDriver = status !== DELIVERY_STATUS.PENDING;
    if (needsDriver && drivers.length === 0) {
      throw new AppError(
        'No hay repartidores (role DRIVER) para asignar. Generá drivers primero o usá entity=all.',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const isDelivered = status === DELIVERY_STATUS.DELIVERED;
    const scheduledDate = isDelivered
      ? daysFromNow(-randomBetween(1, 10))
      : daysFromNow(randomBetween(0, 3));

    deliveries.push({
      _id: randomObjectId(),
      order: order._id,
      driver: needsDriver ? pick(drivers)._id : null,
      status,
      address: order.shippingAddress,
      scheduledDate,
      deliveredAt: isDelivered ? new Date(scheduledDate.getTime() + randomBetween(1, 6) * 3600 * 1000) : null,
    });
  }

  return deliveries;
}

// Conjunto coherente: pedidos de clientes existentes en el set, entregas
// de esos pedidos y repartidores del mismo set.
function buildDataset(qty) {
  const customers = buildUsers(Math.max(2, Math.ceil(qty / 2)), { role: USER_ROLES.USER });
  const drivers = buildUsers(Math.max(1, Math.ceil(qty / 3)), { role: USER_ROLES.DRIVER });
  const orders = Array.from({ length: qty }, () => buildOrder(pick(customers)._id));
  const deliveries = buildDeliveries(orders, drivers);

  return { customers, drivers, orders, deliveries };
}

// ---------- Helpers de carga ----------

async function withHashedPassword(users) {
  const password = await bcrypt.hash(MOCK_CONFIG.PASSWORD, BCRYPT_ROUNDS_FOR_MOCKS);
  return users.map((user) => ({ ...user, password }));
}

// Normaliza lo que devuelve el Repository para que el generador lo use igual
// que a un dato simulado.
const toPlainId = (doc) => String(doc._id);

export const MockService = {
  // ----- GET: devuelven datos simulados, NO guardan nada -----

  getUsers(qtyParam, roleParam) {
    return buildUsers(parseQty(qtyParam), { role: parseRole(roleParam) });
  },

  getDrivers(qtyParam) {
    return buildUsers(parseQty(qtyParam), { role: USER_ROLES.DRIVER });
  },

  getOrders(qtyParam) {
    return buildDataset(parseQty(qtyParam)).orders;
  },

  getDeliveries(qtyParam) {
    return buildDataset(parseQty(qtyParam)).deliveries;
  },

  getDataset(qtyParam) {
    const { customers, drivers, orders, deliveries } = buildDataset(parseQty(qtyParam));
    return { users: customers, drivers, orders, deliveries };
  },

  // ----- POST: inserta datos de prueba en MongoDB -----

  async seed(qtyParam, entityParam) {
    assertSeedAllowed();
    const qty = parseQty(qtyParam);
    const entity = parseEntity(entityParam);

    switch (entity) {
      case MOCK_ENTITIES.USERS: {
        const users = await withHashedPassword(buildUsers(qty));
        return { insertados: await UserRepository.insertMany(users), coleccion: 'users' };
      }

      case MOCK_ENTITIES.DRIVERS: {
        const drivers = await withHashedPassword(buildUsers(qty, { role: USER_ROLES.DRIVER }));
        return { insertados: await UserRepository.insertMany(drivers), coleccion: 'users' };
      }

      case MOCK_ENTITIES.ORDERS: {
        const customers = await UserRepository.getByRole(USER_ROLES.USER);
        if (customers.length === 0) {
          throw new AppError(
            'No hay clientes (role USER) en la base. Cargá users primero o usá entity=all.',
            HTTP_STATUS.BAD_REQUEST
          );
        }
        const orders = Array.from({ length: qty }, () => buildOrder(toPlainId(pick(customers))));
        return { insertados: await OrderRepository.insertMany(orders), coleccion: 'orders' };
      }

      case MOCK_ENTITIES.DELIVERIES: {
        const [orders, orderIdsWithDelivery, drivers] = await Promise.all([
          OrderRepository.getAll(),
          DeliveryRepository.getOrderIdsWithDelivery(),
          UserRepository.getByRole(USER_ROLES.DRIVER),
        ]);
        const alreadyDelivered = new Set(orderIdsWithDelivery);
        const available = orders
          .filter((order) => !alreadyDelivered.has(toPlainId(order)))
          .slice(0, qty)
          .map((order) => ({
            _id: toPlainId(order),
            status: order.status,
            shippingAddress: order.shippingAddress,
          }));

        const deliveries = buildDeliveries(
          available,
          drivers.map((driver) => ({ _id: toPlainId(driver) }))
        );
        if (deliveries.length === 0) {
          throw new AppError(
            'No hay pedidos sin entrega (y no cancelados). Cargá orders primero o usá entity=all.',
            HTTP_STATUS.BAD_REQUEST
          );
        }
        return {
          insertados: await DeliveryRepository.insertMany(deliveries),
          coleccion: 'deliveries',
        };
      }

      case MOCK_ENTITIES.ALL: {
        const { customers, drivers, orders, deliveries } = buildDataset(qty);
        const users = await withHashedPassword([...customers, ...drivers]);

        // Orden importa: primero lo que otros documentos referencian
        const insertedUsers = await UserRepository.insertMany(users);
        const insertedOrders = await OrderRepository.insertMany(orders);
        const insertedDeliveries = await DeliveryRepository.insertMany(deliveries);

        return {
          insertados: insertedUsers + insertedOrders + insertedDeliveries,
          colecciones: {
            users: insertedUsers,
            orders: insertedOrders,
            deliveries: insertedDeliveries,
          },
        };
      }

      default:
        throw new AppError('entity inválida.', HTTP_STATUS.BAD_REQUEST);
    }
  },
};
