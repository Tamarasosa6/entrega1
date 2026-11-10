import { expect } from 'chai';
import {
  USER_ROLES,
  PRODUCT_STATUS,
  ORDER_STATUS,
  ORDER_PRIORITY,
  DELIVERY_STATUS,
} from '../../src/constants/index.js';

const ERROR_KEYS = ['code', 'details', 'message', 'method', 'path', 'status', 'timestamp'];
const OBJECT_ID = /^[0-9a-f]{24}$/i;

const isIsoDate = (value) =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;

// Valida el formato de error definido en el módulo de errores:
// { success: false, error: { code, message, status, details, path, method, timestamp } }
// y que el status HTTP y el código sean los esperados.
export function expectErrorResponse(res, { status, code, method, path, message, details }) {
  expect(res.status).to.equal(status);
  expect(res.headers['content-type']).to.match(/application\/json/);

  expect(Object.keys(res.body).sort()).to.eql(['error', 'success']);
  expect(res.body.success).to.equal(false);

  const { error } = res.body;
  expect(Object.keys(error).sort()).to.eql(ERROR_KEYS);
  expect(error.code).to.equal(code);
  expect(error.status).to.equal(status);
  expect(error.message).to.be.a('string');
  expect(error.message.length).to.be.above(0);
  expect(isIsoDate(error.timestamp)).to.equal(true);
  expect(error.details === null || typeof error.details === 'object').to.equal(true);

  if (method !== undefined) expect(error.method).to.equal(method);
  if (path !== undefined) expect(error.path).to.equal(path);
  if (message !== undefined) expect(error.message).to.equal(message);
  if (details !== undefined) expect(error.details).to.eql(details);

  return error;
}

const expectProperties = (object, keys) => {
  expect(object).to.be.an('object');
  keys.forEach((key) => expect(object).to.have.property(key));
};

export function expectUser(user) {
  expectProperties(user, ['_id', 'name', 'email', 'role', 'createdAt', 'updatedAt']);
  expect(user._id).to.match(OBJECT_ID);
  expect(user.name).to.be.a('string');
  expect(user.email).to.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  expect(Object.values(USER_ROLES)).to.include(user.role);
  expect(isIsoDate(user.createdAt)).to.equal(true);
  expect(user).to.not.have.property('password'); // nunca se expone la contraseña
  expect(user).to.not.have.property('__v');
}

export function expectProduct(product) {
  expectProperties(product, ['_id', 'name', 'description', 'price', 'stock', 'status', 'createdAt', 'updatedAt']);
  expect(product._id).to.match(OBJECT_ID);
  expect(product.price).to.be.a('number');
  expect(Number.isInteger(product.stock)).to.equal(true);
  expect(Object.values(PRODUCT_STATUS)).to.include(product.status);
}

export function expectOrder(order) {
  expectProperties(order, ['_id', 'customer', 'items', 'total', 'status', 'priority', 'shippingAddress', 'createdAt', 'updatedAt']);
  expect(order._id).to.match(OBJECT_ID);
  expect(order.customer).to.match(OBJECT_ID);
  expect(order.items).to.be.an('array');
  expect(order.items.length).to.be.above(0);
  order.items.forEach((item) => {
    expectProperties(item, ['name', 'quantity', 'unitPrice']);
    expect(item.name).to.be.a('string');
    expect(Number.isInteger(item.quantity)).to.equal(true);
    expect(item.unitPrice).to.be.a('number');
  });
  expect(order.total).to.equal(order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
  expect(Object.values(ORDER_STATUS)).to.include(order.status);
  expect(Object.values(ORDER_PRIORITY)).to.include(order.priority);
  expect(order.shippingAddress).to.be.a('string');
}

export function expectDelivery(delivery) {
  expectProperties(delivery, ['_id', 'order', 'driver', 'status', 'address', 'scheduledDate', 'deliveredAt']);
  expect(delivery._id).to.match(OBJECT_ID);
  expect(delivery.order).to.match(OBJECT_ID);
  expect(delivery.driver === null || OBJECT_ID.test(delivery.driver)).to.equal(true);
  expect(Object.values(DELIVERY_STATUS)).to.include(delivery.status);
  expect(delivery.address).to.be.a('string');
  expect(isIsoDate(delivery.scheduledDate)).to.equal(true);
  expect(delivery.deliveredAt === null || isIsoDate(delivery.deliveredAt)).to.equal(true);
  // Reglas del dominio: PENDING no tiene repartidor; DELIVERED tiene fecha de entrega
  if (delivery.status === DELIVERY_STATUS.PENDING) expect(delivery.driver).to.equal(null);
  if (delivery.status === DELIVERY_STATUS.DELIVERED) expect(delivery.deliveredAt).to.not.equal(null);
  if (delivery.status !== DELIVERY_STATUS.DELIVERED) expect(delivery.deliveredAt).to.equal(null);
}
