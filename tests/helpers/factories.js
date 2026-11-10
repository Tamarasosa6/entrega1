// Datos de prueba controlados: se crean dentro del entorno de testing (nunca a mano) y se apoyan
// en el generador de mocks del proyecto para nombres y emails. Devuelven lo mismo que la API
// enviaría por JSON (ids como texto, fechas ISO).
import {
  USER_ROLES,
  ORDER_STATUS,
  ORDER_PRIORITY,
  DELIVERY_STATUS,
  PRODUCT_STATUS,
} from '../../src/constants/index.js';
import { MockService } from '../../src/services/mock.service.js';
import { UserModel } from '../../src/models/user.model.js';
import { ProductModel } from '../../src/models/product.model.js';
import { OrderModel } from '../../src/models/order.model.js';
import { DeliveryModel } from '../../src/models/delivery.model.js';

const plain = (doc) => JSON.parse(JSON.stringify(doc));

const usedEmails = new Set();

// Usuario simulado con email que no se repitió en esta corrida.
function uniqueMockUser(role) {
  for (;;) {
    const [user] = MockService.getUsers('1', role);
    if (!usedEmails.has(user.email)) {
      usedEmails.add(user.email);
      return user;
    }
  }
}

export async function createUser({ role = USER_ROLES.USER, ...overrides } = {}) {
  const mock = uniqueMockUser(role);
  const user = await UserModel.create({
    name: mock.name,
    email: mock.email,
    password: 'hash-de-prueba', // no se usa para login en los tests
    role,
    ...overrides,
  });
  return plain(user);
}

export async function createProduct({ name = 'Caja chica', price = 1500, stock = 10, ...overrides } = {}) {
  const product = await ProductModel.create({
    name,
    description: '20x20',
    price,
    stock,
    status: stock > 0 ? PRODUCT_STATUS.AVAILABLE : PRODUCT_STATUS.OUT_OF_STOCK,
    ...overrides,
  });
  return plain(product);
}

export const DEFAULT_ITEMS = Object.freeze([
  Object.freeze({ name: 'Caja chica', quantity: 2, unitPrice: 1500 }),
  Object.freeze({ name: 'Sobre', quantity: 1, unitPrice: 500 }),
]);

export const itemsTotal = (items) => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

// Si no se indica cliente, crea uno con rol USER.
export async function createOrder({
  customer,
  items = DEFAULT_ITEMS.map((item) => ({ ...item })),
  status = ORDER_STATUS.PENDING,
  priority = ORDER_PRIORITY.NORMAL,
  shippingAddress = 'Mitre 123, Córdoba',
} = {}) {
  const customerId = customer ?? (await createUser({ role: USER_ROLES.USER }))._id;
  const order = await OrderModel.create({
    customer: customerId,
    items,
    total: itemsTotal(items),
    status,
    priority,
    shippingAddress,
  });
  return plain(order);
}

// Si no se indica pedido, crea uno (con su cliente).
export async function createDelivery({ order, driver = null, status = DELIVERY_STATUS.PENDING } = {}) {
  const base = order ?? (await createOrder());
  const delivery = await DeliveryModel.create({
    order: base._id,
    driver,
    status,
    address: base.shippingAddress,
    scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    deliveredAt: status === DELIVERY_STATUS.DELIVERED ? new Date() : null,
  });
  return plain(delivery);
}
