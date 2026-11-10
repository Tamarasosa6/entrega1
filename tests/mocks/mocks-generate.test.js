import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app.js';
import {
  USER_ROLES,
  ORDER_STATUS,
  ORDER_PRIORITY,
  DELIVERY_STATUS,
  MOCK_CONFIG,
} from '../../src/constants/index.js';
import { UserModel } from '../../src/models/user.model.js';
import { OrderModel } from '../../src/models/order.model.js';
import { DeliveryModel } from '../../src/models/delivery.model.js';
import { clearDatabase } from '../helpers/db.js';
import { expectErrorResponse } from '../helpers/assertions.js';

const MIN_QTY = MOCK_CONFIG.MIN_QTY;
const MAX_QTY = MOCK_CONFIG.MAX_QTY;

// Los datos simulados son aleatorios: los tests validan estructura y reglas, nunca valores fijos.
const expectMockUser = (user) => {
  expect(user._id).to.match(/^[0-9a-f]{24}$/i);
  expect(user.name).to.be.a('string');
  expect(user.email).to.match(/^[a-z]+\.[a-z]+\d{4}@test\.com$/);
  expect(Object.values(USER_ROLES)).to.include(user.role);
  expect(user).to.not.have.property('password');
};

describe('Mocks - datos simulados (GET /api/mocks/*)', () => {
  beforeEach(clearDatabase);

  describe('GET /api/mocks/users', () => {
    it('devuelve la cantidad indicada de usuarios simulados con roles válidos y emails únicos', async () => {
      const res = await request(app).get('/api/mocks/users?qty=25');

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
      expect(res.body).to.have.lengthOf(25);
      res.body.forEach(expectMockUser);
      expect(new Set(res.body.map((user) => user.email)).size).to.equal(25);
    });

    it('usa la cantidad por defecto si no se indica qty (o llega vacío)', async () => {
      const withoutQty = await request(app).get('/api/mocks/users');
      const emptyQty = await request(app).get('/api/mocks/users?qty=');

      expect(withoutQty.status).to.equal(200);
      expect(withoutQty.body).to.have.lengthOf(MOCK_CONFIG.DEFAULT_QTY);
      expect(emptyQty.status).to.equal(200);
      expect(emptyQty.body).to.have.lengthOf(MOCK_CONFIG.DEFAULT_QTY);
    });

    it('acepta los límites del rango (1 y 100)', async () => {
      const min = await request(app).get(`/api/mocks/users?qty=${MIN_QTY}`);
      const max = await request(app).get(`/api/mocks/users?qty=${MAX_QTY}`);

      expect(min.status).to.equal(200);
      expect(min.body).to.have.lengthOf(MIN_QTY);
      expect(max.status).to.equal(200);
      expect(max.body).to.have.lengthOf(MAX_QTY);
    });

    Object.values(USER_ROLES).forEach((role) => {
      it(`con role=${role} todos los usuarios generados tienen ese rol`, async () => {
        const res = await request(app).get(`/api/mocks/users?qty=15&role=${role}`);

        expect(res.status).to.equal(200);
        expect(res.body).to.have.lengthOf(15);
        res.body.forEach((user) => expect(user.role).to.equal(role));
      });
    });

    it('devuelve datos distintos en cada llamada', async () => {
      const first = await request(app).get('/api/mocks/users?qty=10');
      const second = await request(app).get('/api/mocks/users?qty=10');

      const firstIds = first.body.map((user) => user._id);
      const secondIds = second.body.map((user) => user._id);
      expect(firstIds).to.not.eql(secondIds);
    });
  });

  describe('GET /api/mocks/drivers', () => {
    it('devuelve repartidores (rol DRIVER)', async () => {
      const res = await request(app).get('/api/mocks/drivers?qty=8');

      expect(res.status).to.equal(200);
      expect(res.body).to.have.lengthOf(8);
      res.body.forEach((driver) => {
        expectMockUser(driver);
        expect(driver.role).to.equal(USER_ROLES.DRIVER);
      });
    });
  });

  describe('GET /api/mocks/orders', () => {
    it('devuelve pedidos con la estructura del modelo, estados y prioridades válidos', async () => {
      const res = await request(app).get('/api/mocks/orders?qty=20');

      expect(res.status).to.equal(200);
      expect(res.body).to.have.lengthOf(20);
      res.body.forEach((order) => {
        expect(order._id).to.match(/^[0-9a-f]{24}$/i);
        expect(order.customer).to.match(/^[0-9a-f]{24}$/i);
        expect(order.items.length).to.be.above(0);
        expect(order.total).to.equal(order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
        expect(Object.values(ORDER_STATUS)).to.include(order.status);
        expect(Object.values(ORDER_PRIORITY)).to.include(order.priority);
        expect(order.shippingAddress).to.be.a('string');
      });
    });

    it('con status y priority fuerza esos valores en todos los pedidos', async () => {
      const res = await request(app).get(
        `/api/mocks/orders?qty=12&status=${ORDER_STATUS.CANCELLED}&priority=${ORDER_PRIORITY.URGENT}`
      );

      expect(res.status).to.equal(200);
      expect(res.body).to.have.lengthOf(12);
      res.body.forEach((order) => {
        expect(order.status).to.equal(ORDER_STATUS.CANCELLED);
        expect(order.priority).to.equal(ORDER_PRIORITY.URGENT);
      });
    });
  });

  describe('GET /api/mocks/deliveries', () => {
    it('devuelve entregas con la estructura del modelo (a lo sumo una por pedido)', async () => {
      const res = await request(app).get('/api/mocks/deliveries?qty=30');

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
      expect(res.body.length).to.be.at.most(30); // los pedidos cancelados no tienen entrega
      const orders = res.body.map((delivery) => delivery.order);
      expect(new Set(orders).size).to.equal(orders.length);
      res.body.forEach((delivery) => {
        expect(Object.values(DELIVERY_STATUS)).to.include(delivery.status);
        expect(delivery.address).to.be.a('string');
        expect(delivery.scheduledDate).to.be.a('string');
        if (delivery.status === DELIVERY_STATUS.PENDING) expect(delivery.driver).to.equal(null);
        else expect(delivery.driver).to.match(/^[0-9a-f]{24}$/i);
      });
    });
  });

  describe('GET /api/mocks/dataset', () => {
    it('devuelve un conjunto consistente: pedido ↔ usuario, entrega ↔ pedido, repartidor con rol DRIVER', async () => {
      const res = await request(app).get('/api/mocks/dataset?qty=40');

      expect(res.status).to.equal(200);
      expect(Object.keys(res.body).sort()).to.eql(['deliveries', 'drivers', 'orders', 'users']);
      const { users, drivers, orders, deliveries } = res.body;

      expect(orders).to.have.lengthOf(40);
      users.forEach((user) => expect(user.role).to.equal(USER_ROLES.USER));
      drivers.forEach((driver) => expect(driver.role).to.equal(USER_ROLES.DRIVER));

      const userIds = new Set(users.map((user) => user._id));
      const driverIds = new Set(drivers.map((driver) => driver._id));
      const ordersById = new Map(orders.map((order) => [order._id, order]));

      // pedido ↔ usuario
      orders.forEach((order) => expect(userIds.has(order.customer)).to.equal(true));

      // entrega ↔ pedido (una por pedido, ninguna para pedidos cancelados) y repartidor coherente
      const seenOrders = new Set();
      deliveries.forEach((delivery) => {
        const order = ordersById.get(delivery.order);
        expect(order, 'la entrega apunta a un pedido del conjunto').to.not.equal(undefined);
        expect(seenOrders.has(delivery.order)).to.equal(false);
        seenOrders.add(delivery.order);
        expect(order.status).to.not.equal(ORDER_STATUS.CANCELLED);
        expect(delivery.address).to.equal(order.shippingAddress);

        if (delivery.status === DELIVERY_STATUS.PENDING) {
          expect(delivery.driver).to.equal(null);
          expect(order.status).to.equal(ORDER_STATUS.PENDING);
        } else {
          expect(driverIds.has(delivery.driver)).to.equal(true);
        }
        if (delivery.status === DELIVERY_STATUS.DELIVERED) {
          expect(order.status).to.equal(ORDER_STATUS.DELIVERED);
          expect(delivery.deliveredAt).to.be.a('string');
        } else {
          expect(delivery.deliveredAt).to.equal(null);
        }
      });
      expect(deliveries).to.have.lengthOf(orders.filter((order) => order.status !== ORDER_STATUS.CANCELLED).length);
    });
  });

  describe('los endpoints GET no guardan nada en la base de datos', () => {
    it('después de pedir todos los mocks las colecciones siguen vacías', async () => {
      await request(app).get('/api/mocks/users?qty=10');
      await request(app).get('/api/mocks/drivers?qty=10');
      await request(app).get('/api/mocks/orders?qty=10');
      await request(app).get('/api/mocks/deliveries?qty=10');
      await request(app).get('/api/mocks/dataset?qty=10');

      expect(await UserModel.countDocuments({})).to.equal(0);
      expect(await OrderModel.countDocuments({})).to.equal(0);
      expect(await DeliveryModel.countDocuments({})).to.equal(0);
    });
  });

  describe('cantidades inválidas', () => {
    const endpoints = ['users', 'drivers', 'orders', 'deliveries', 'dataset'];

    endpoints.forEach((endpoint) => {
      describe(`GET /api/mocks/${endpoint}`, () => {
        const url = (qty) => `/api/mocks/${endpoint}?qty=${qty}`;

        it('qty=0 → 400 INVALID_QUANTITY (OUT_OF_RANGE)', async () => {
          const res = await request(app).get(url(0));

          expectErrorResponse(res, {
            status: 400,
            code: 'INVALID_QUANTITY',
            method: 'GET',
            path: url(0),
            details: { received: '0', min: MIN_QTY, max: MAX_QTY, reason: 'OUT_OF_RANGE' },
          });
        });

        it(`qty=${MAX_QTY + 1} → 400 INVALID_QUANTITY (OUT_OF_RANGE)`, async () => {
          const res = await request(app).get(url(MAX_QTY + 1));

          expectErrorResponse(res, {
            status: 400,
            code: 'INVALID_QUANTITY',
            details: { received: String(MAX_QTY + 1), min: MIN_QTY, max: MAX_QTY, reason: 'OUT_OF_RANGE' },
          });
        });

        it('qty=abc → 400 INVALID_QUANTITY (NOT_A_NUMBER)', async () => {
          const res = await request(app).get(url('abc'));

          expectErrorResponse(res, {
            status: 400,
            code: 'INVALID_QUANTITY',
            details: { received: 'abc', min: MIN_QTY, max: MAX_QTY, reason: 'NOT_A_NUMBER' },
          });
        });

        it('qty=2.5 → 400 INVALID_QUANTITY (NOT_AN_INTEGER)', async () => {
          const res = await request(app).get(url('2.5'));

          expectErrorResponse(res, {
            status: 400,
            code: 'INVALID_QUANTITY',
            details: { received: '2.5', min: MIN_QTY, max: MAX_QTY, reason: 'NOT_AN_INTEGER' },
          });
        });

        it('qty=-5 → 400 NEGATIVE_VALUE', async () => {
          const res = await request(app).get(url(-5));

          expectErrorResponse(res, {
            status: 400,
            code: 'NEGATIVE_VALUE',
            method: 'GET',
            path: url(-5),
            details: { field: 'qty', value: -5 },
          });
        });
      });
    });

    it('qty repetido (?qty=1&qty=2) → 400 INVALID_QUANTITY (NOT_A_NUMBER)', async () => {
      const res = await request(app).get('/api/mocks/users?qty=1&qty=2');

      const error = expectErrorResponse(res, { status: 400, code: 'INVALID_QUANTITY' });
      expect(error.details.reason).to.equal('NOT_A_NUMBER');
    });

    it('un error de validación no genera datos (la respuesta no es una lista)', async () => {
      const res = await request(app).get('/api/mocks/users?qty=0');

      expect(res.body).to.not.be.an('array');
      expect(res.body.success).to.equal(false);
    });
  });

  describe('filtros inválidos', () => {
    it('role=cliente → 400 INVALID_ROLE', async () => {
      const res = await request(app).get('/api/mocks/users?qty=3&role=cliente');

      expectErrorResponse(res, {
        status: 400,
        code: 'INVALID_ROLE',
        details: { received: 'cliente', allowed: Object.values(USER_ROLES) },
      });
    });

    it('status=ENVIADO → 400 INVALID_STATUS', async () => {
      const res = await request(app).get('/api/mocks/orders?qty=3&status=ENVIADO');

      expectErrorResponse(res, {
        status: 400,
        code: 'INVALID_STATUS',
        details: { received: 'ENVIADO', allowed: Object.values(ORDER_STATUS) },
      });
    });

    it('priority=MAXIMA → 400 INVALID_PRIORITY', async () => {
      const res = await request(app).get('/api/mocks/orders?qty=3&priority=MAXIMA');

      expectErrorResponse(res, {
        status: 400,
        code: 'INVALID_PRIORITY',
        details: { received: 'MAXIMA', allowed: Object.values(ORDER_PRIORITY) },
      });
    });
  });
});
