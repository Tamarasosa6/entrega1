import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app.js';
import {
  USER_ROLES,
  ORDER_STATUS,
  DELIVERY_STATUS,
  MOCK_ENTITIES,
  MOCK_CONFIG,
} from '../../src/constants/index.js';
import { UserModel } from '../../src/models/user.model.js';
import { OrderModel } from '../../src/models/order.model.js';
import { DeliveryModel } from '../../src/models/delivery.model.js';
import { clearDatabase } from '../helpers/db.js';
import { createUser, createOrder } from '../helpers/factories.js';
import { stubMethod, mongoDuplicateKeyError } from '../helpers/stubs.js';
import { expectErrorResponse, expectUser, expectOrder, expectDelivery } from '../helpers/assertions.js';

const seed = (query) => request(app).post(`/api/mocks/seed${query}`);

describe('Mocks - carga de datos de prueba (POST /api/mocks/seed)', () => {
  let restoreStubs;

  beforeEach(async () => {
    restoreStubs = [];
    await clearDatabase();
  });

  afterEach(() => {
    restoreStubs.forEach((restore) => restore());
  });

  const countAll = async () => ({
    users: await UserModel.countDocuments({}),
    orders: await OrderModel.countDocuments({}),
    deliveries: await DeliveryModel.countDocuments({}),
  });

  describe('carga exitosa', () => {
    it('sin parámetros inserta la cantidad por defecto de usuarios', async () => {
      const res = await seed('');

      expect(res.status).to.equal(201);
      expect(res.body).to.eql({ insertados: MOCK_CONFIG.DEFAULT_QTY, coleccion: 'users' });
      expect(await UserModel.countDocuments({})).to.equal(MOCK_CONFIG.DEFAULT_QTY);
    });

    it('entity=users inserta usuarios con roles válidos, visibles en GET /api/users y sin contraseña', async () => {
      const res = await seed('?qty=12&entity=users');

      expect(res.status).to.equal(201);
      expect(res.body).to.eql({ insertados: 12, coleccion: 'users' });

      const list = await request(app).get('/api/users');
      expect(list.status).to.equal(200);
      expect(list.body).to.have.lengthOf(12);
      list.body.forEach(expectUser);
      list.body.forEach((user) => expect(user.email).to.match(/@test\.com$/));
    });

    it('guarda la contraseña de prueba hasheada', async () => {
      await seed('?qty=3&entity=users');

      const stored = await UserModel.find({}).lean();
      expect(stored).to.have.lengthOf(3);
      stored.forEach((user) => {
        expect(user.password).to.not.equal(MOCK_CONFIG.PASSWORD);
        expect(user.password).to.match(/^\$2[aby]\$/);
      });
    });

    it('entity=drivers inserta solo repartidores (rol DRIVER)', async () => {
      const res = await seed('?qty=5&entity=drivers');

      expect(res.status).to.equal(201);
      expect(res.body).to.eql({ insertados: 5, coleccion: 'users' });
      const stored = await UserModel.find({}).lean();
      expect(stored).to.have.lengthOf(5);
      stored.forEach((user) => expect(user.role).to.equal(USER_ROLES.DRIVER));
    });

    it('entity=orders inserta pedidos asignados a clientes (rol USER) que ya existen', async () => {
      const client = await createUser({ role: USER_ROLES.USER });
      await createUser({ role: USER_ROLES.DRIVER }); // un repartidor no puede ser cliente de un pedido

      const res = await seed('?qty=7&entity=orders');

      expect(res.status).to.equal(201);
      expect(res.body).to.eql({ insertados: 7, coleccion: 'orders' });

      const list = await request(app).get('/api/orders');
      expect(list.body).to.have.lengthOf(7);
      list.body.forEach(expectOrder);
      list.body.forEach((order) => expect(order.customer).to.equal(client._id));
    });

    it('entity=deliveries inserta entregas para pedidos existentes sin duplicar ni repetir', async () => {
      // Tres pedidos PENDING: su entrega no necesita repartidor (resultado determinista)
      const customer = await createUser({ role: USER_ROLES.USER });
      for (let i = 0; i < 3; i += 1) {
        await createOrder({ customer: customer._id, status: ORDER_STATUS.PENDING });
      }

      const first = await seed('?qty=2&entity=deliveries');
      expect(first.status).to.equal(201);
      expect(first.body).to.eql({ insertados: 2, coleccion: 'deliveries' });

      // La segunda carga solo encuentra el pedido que todavía no tiene entrega
      const second = await seed('?qty=5&entity=deliveries');
      expect(second.status).to.equal(201);
      expect(second.body).to.eql({ insertados: 1, coleccion: 'deliveries' });

      // Ya no quedan pedidos sin entrega
      const third = await seed('?qty=5&entity=deliveries');
      expectErrorResponse(third, { status: 409, code: 'MOCK_DEPENDENCY_MISSING' });

      const list = await request(app).get('/api/deliveries');
      expect(list.body).to.have.lengthOf(3);
      list.body.forEach(expectDelivery);
      list.body.forEach((delivery) => {
        expect(delivery.status).to.equal(DELIVERY_STATUS.PENDING);
        expect(delivery.driver).to.equal(null);
      });
      expect(new Set(list.body.map((delivery) => delivery.order)).size).to.equal(3);
    });

    it('entity=deliveries asigna repartidores existentes a los pedidos en curso', async () => {
      const driver = await createUser({ role: USER_ROLES.DRIVER });
      const order = await createOrder({ status: ORDER_STATUS.IN_PROGRESS });

      const res = await seed('?qty=1&entity=deliveries');

      expect(res.status).to.equal(201);
      const stored = await DeliveryModel.find({}).lean();
      expect(stored).to.have.lengthOf(1);
      expect(String(stored[0].order)).to.equal(order._id);
      expect(String(stored[0].driver)).to.equal(driver._id);
      expect([DELIVERY_STATUS.ASSIGNED, DELIVERY_STATUS.IN_TRANSIT]).to.include(stored[0].status);
    });

    it('entity=all inserta un conjunto completo y consistente', async () => {
      const res = await seed('?qty=15&entity=all');

      expect(res.status).to.equal(201);
      expect(Object.keys(res.body).sort()).to.eql(['colecciones', 'insertados']);
      const { users, orders, deliveries } = res.body.colecciones;
      expect(orders).to.equal(15);
      expect(users).to.be.above(0);
      expect(res.body.insertados).to.equal(users + orders + deliveries);

      // Lo informado coincide con lo que realmente quedó en la base
      expect(await countAll()).to.eql({ users, orders, deliveries });

      // Relaciones: pedido ↔ usuario, entrega ↔ pedido, repartidor con rol coherente
      const storedUsers = await UserModel.find({}).lean();
      const userRoleById = new Map(storedUsers.map((user) => [String(user._id), user.role]));
      const storedOrders = await OrderModel.find({}).lean();
      const orderIds = new Set(storedOrders.map((order) => String(order._id)));

      storedOrders.forEach((order) => {
        expect(userRoleById.get(String(order.customer))).to.equal(USER_ROLES.USER);
      });
      const storedDeliveries = await DeliveryModel.find({}).lean();
      storedDeliveries.forEach((delivery) => {
        expect(orderIds.has(String(delivery.order))).to.equal(true);
        if (delivery.driver === null) expect(delivery.status).to.equal(DELIVERY_STATUS.PENDING);
        else expect(userRoleById.get(String(delivery.driver))).to.equal(USER_ROLES.DRIVER);
      });
    });
  });

  describe('errores de validación (no se inserta nada)', () => {
    const invalidQuantities = [
      ['0', 'OUT_OF_RANGE'],
      [String(MOCK_CONFIG.MAX_QTY + 1), 'OUT_OF_RANGE'],
      ['abc', 'NOT_A_NUMBER'],
      ['2.5', 'NOT_AN_INTEGER'],
    ];

    invalidQuantities.forEach(([qty, reason]) => {
      it(`qty=${qty} → 400 INVALID_QUANTITY (${reason})`, async () => {
        const path = `/api/mocks/seed?qty=${qty}`;
        const res = await request(app).post(path);

        expectErrorResponse(res, {
          status: 400,
          code: 'INVALID_QUANTITY',
          method: 'POST',
          path,
          details: { received: qty, min: MOCK_CONFIG.MIN_QTY, max: MOCK_CONFIG.MAX_QTY, reason },
        });
        expect(await countAll()).to.eql({ users: 0, orders: 0, deliveries: 0 });
      });
    });

    it('qty=-3 → 400 NEGATIVE_VALUE', async () => {
      const res = await seed('?qty=-3');

      expectErrorResponse(res, { status: 400, code: 'NEGATIVE_VALUE', details: { field: 'qty', value: -3 } });
      expect(await countAll()).to.eql({ users: 0, orders: 0, deliveries: 0 });
    });

    it('entity inválida → 400 INVALID_MOCK_ENTITY con las entidades permitidas', async () => {
      const res = await seed('?qty=5&entity=productos');

      expectErrorResponse(res, {
        status: 400,
        code: 'INVALID_MOCK_ENTITY',
        details: { received: 'productos', allowed: Object.values(MOCK_ENTITIES) },
      });
      expect(await countAll()).to.eql({ users: 0, orders: 0, deliveries: 0 });
    });
  });

  describe('datos previos que faltan → 409 MOCK_DEPENDENCY_MISSING', () => {
    it('entity=orders sin clientes en la base', async () => {
      await createUser({ role: USER_ROLES.DRIVER }); // solo hay repartidores: no sirven como clientes

      const res = await seed('?qty=5&entity=orders');

      const error = expectErrorResponse(res, { status: 409, code: 'MOCK_DEPENDENCY_MISSING', method: 'POST' });
      expect(error.details.entity).to.equal(MOCK_ENTITIES.ORDERS);
      expect(await OrderModel.countDocuments({})).to.equal(0);
    });

    it('entity=deliveries sin pedidos en la base', async () => {
      const res = await seed('?qty=5&entity=deliveries');

      const error = expectErrorResponse(res, { status: 409, code: 'MOCK_DEPENDENCY_MISSING' });
      expect(error.details.entity).to.equal(MOCK_ENTITIES.DELIVERIES);
    });

    it('entity=deliveries con pedidos en curso pero sin repartidores', async () => {
      await createOrder({ status: ORDER_STATUS.IN_PROGRESS });

      const res = await seed('?qty=5&entity=deliveries');

      const error = expectErrorResponse(res, { status: 409, code: 'MOCK_DEPENDENCY_MISSING' });
      expect(error.details.missing).to.include('DRIVER');
      expect(await DeliveryModel.countDocuments({})).to.equal(0);
    });

    it('entity=deliveries con pedidos cancelados únicamente (no tienen entrega)', async () => {
      await createOrder({ status: ORDER_STATUS.CANCELLED });

      const res = await seed('?qty=5&entity=deliveries');

      expectErrorResponse(res, { status: 409, code: 'MOCK_DEPENDENCY_MISSING' });
      expect(await DeliveryModel.countDocuments({})).to.equal(0);
    });
  });

  describe('fallas de MongoDB durante la carga → 500 MOCK_SEED_FAILED', () => {
    it('responde con el formato de error, sin filtrar el detalle interno', async () => {
      restoreStubs.push(
        stubMethod(UserModel, 'insertMany', async () => {
          throw mongoDuplicateKeyError();
        })
      );

      const res = await seed('?qty=5&entity=users');

      const error = expectErrorResponse(res, {
        status: 500,
        code: 'MOCK_SEED_FAILED',
        method: 'POST',
        details: { entity: 'users', reason: 'DUPLICATE_KEY' },
      });
      expect(error.message).to.include('users');
      expect(JSON.stringify(res.body)).to.not.include('secreto');
      expect(JSON.stringify(res.body)).to.not.include('E11000');
    });

    it('con entity=all, si falla a mitad de camino, informa el error y puede quedar una carga parcial', async () => {
      restoreStubs.push(
        stubMethod(OrderModel, 'insertMany', async () => {
          throw mongoDuplicateKeyError();
        })
      );

      const res = await seed('?qty=5&entity=all');

      expectErrorResponse(res, {
        status: 500,
        code: 'MOCK_SEED_FAILED',
        details: { entity: 'all', reason: 'DUPLICATE_KEY' },
      });
      // Los usuarios se insertaron antes de que fallaran los pedidos (carga parcial documentada)
      expect(await UserModel.countDocuments({})).to.be.above(0);
      expect(await OrderModel.countDocuments({})).to.equal(0);
    });
  });
});
