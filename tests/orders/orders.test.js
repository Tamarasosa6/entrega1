import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app.js';
import { USER_ROLES, ORDER_STATUS, ORDER_PRIORITY } from '../../src/constants/index.js';
import { OrderModel } from '../../src/models/order.model.js';
import { OrderNotFoundError, UserNotFoundError } from '../../src/errors/domain.errors.js';
import { clearDatabase } from '../helpers/db.js';
import { createUser, createOrder, itemsTotal } from '../helpers/factories.js';
import { expectErrorResponse, expectOrder } from '../helpers/assertions.js';
import { NON_EXISTENT_ID, MALFORMED_ID } from '../helpers/constants.js';

describe('Orders', () => {
  beforeEach(clearDatabase);

  describe('GET /api/orders', () => {
    it('devuelve la lista de pedidos con la estructura correcta', async () => {
      const customer = await createUser({ role: USER_ROLES.USER });
      const first = await createOrder({ customer: customer._id, priority: ORDER_PRIORITY.HIGH });
      const second = await createOrder({ customer: customer._id, status: ORDER_STATUS.IN_PROGRESS });

      const res = await request(app).get('/api/orders');

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
      expect(res.body).to.have.lengthOf(2);
      res.body.forEach(expectOrder);
      res.body.forEach((order) => expect(order.customer).to.equal(customer._id));
      expect(res.body.map((order) => order._id).sort()).to.eql([first._id, second._id].sort());
      expect(res.body.find((order) => order._id === first._id).priority).to.equal(ORDER_PRIORITY.HIGH);
    });

    it('devuelve una lista vacía cuando no hay pedidos', async () => {
      const res = await request(app).get('/api/orders');

      expect(res.status).to.equal(200);
      expect(res.body).to.eql([]);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('devuelve el pedido pedido', async () => {
      const order = await createOrder();

      const res = await request(app).get(`/api/orders/${order._id}`);

      expect(res.status).to.equal(200);
      expectOrder(res.body);
      expect(res.body._id).to.equal(order._id);
      expect(res.body.customer).to.equal(order.customer);
      expect(res.body.total).to.equal(order.total);
    });

    it('responde 404 ORDER_NOT_FOUND si el pedido no existe', async () => {
      const path = `/api/orders/${NON_EXISTENT_ID}`;
      const res = await request(app).get(path);

      const error = expectErrorResponse(res, {
        status: 404,
        code: 'ORDER_NOT_FOUND',
        method: 'GET',
        path,
        message: new OrderNotFoundError(NON_EXISTENT_ID).message,
      });
      expect(error.message).to.include(NON_EXISTENT_ID);
    });

    it('responde 400 INVALID_ID si el id tiene formato inválido', async () => {
      const path = `/api/orders/${MALFORMED_ID}`;
      const res = await request(app).get(path);

      expectErrorResponse(res, { status: 400, code: 'INVALID_ID', method: 'GET', path, details: { id: MALFORMED_ID } });
    });
  });

  describe('POST /api/orders', () => {
    const items = [
      { name: 'Caja chica', quantity: 2, unitPrice: 1500 },
      { name: 'Sobre', quantity: 3, unitPrice: 200 },
    ];
    let customer;

    beforeEach(async () => {
      customer = await createUser({ role: USER_ROLES.USER }); // usuario válido creado antes del pedido
    });

    const validBody = () => ({ customer: customer._id, items, shippingAddress: 'Mitre 123, Córdoba' });

    it('crea un pedido con datos válidos: calcula el total y empieza en PENDING con prioridad NORMAL', async () => {
      const res = await request(app).post('/api/orders').send(validBody());

      expect(res.status).to.equal(201);
      expectOrder(res.body);
      expect(res.body.customer).to.equal(customer._id);
      expect(res.body.items).to.eql(items);
      expect(res.body.total).to.equal(itemsTotal(items));
      expect(res.body.total).to.equal(3600);
      expect(res.body.status).to.equal(ORDER_STATUS.PENDING);
      expect(res.body.priority).to.equal(ORDER_PRIORITY.NORMAL);
      expect(res.body.shippingAddress).to.equal('Mitre 123, Córdoba');
    });

    it('queda guardado y se puede consultar por id', async () => {
      const created = await request(app).post('/api/orders').send(validBody());

      const res = await request(app).get(`/api/orders/${created.body._id}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.eql(created.body);
    });

    it('respeta la prioridad indicada', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({ ...validBody(), priority: ORDER_PRIORITY.URGENT });

      expect(res.status).to.equal(201);
      expect(res.body.priority).to.equal(ORDER_PRIORITY.URGENT);
    });

    it('ignora el total y el estado enviados por el cliente: los define el servidor', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({ ...validBody(), total: 1, status: ORDER_STATUS.DELIVERED });

      expect(res.status).to.equal(201);
      expect(res.body.total).to.equal(3600);
      expect(res.body.status).to.equal(ORDER_STATUS.PENDING);
    });

    it('responde 400 VALIDATION_ERROR con el detalle de cada campo si faltan datos', async () => {
      const res = await request(app).post('/api/orders').send({});

      const error = expectErrorResponse(res, { status: 400, code: 'VALIDATION_ERROR', method: 'POST', path: '/api/orders' });
      expect(error.details.errors.map((e) => e.field)).to.eql(['customer', 'items', 'shippingAddress']);
      expect(await OrderModel.countDocuments({})).to.equal(0);
    });

    it('responde 400 VALIDATION_ERROR si la lista de ítems está vacía', async () => {
      const res = await request(app).post('/api/orders').send({ ...validBody(), items: [] });

      const error = expectErrorResponse(res, { status: 400, code: 'VALIDATION_ERROR' });
      expect(error.details.errors.map((e) => e.field)).to.eql(['items']);
    });

    it('responde 400 VALIDATION_ERROR indicando qué campo de qué ítem es inválido', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({ ...validBody(), items: [{ name: '', quantity: 1.5, unitPrice: 'caro' }] });

      const error = expectErrorResponse(res, { status: 400, code: 'VALIDATION_ERROR' });
      expect(error.details.errors.map((e) => e.field)).to.eql([
        'items[0].name',
        'items[0].quantity',
        'items[0].unitPrice',
      ]);
    });

    it('responde 400 VALIDATION_ERROR si la cantidad de un ítem es cero', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({ ...validBody(), items: [{ name: 'Caja', quantity: 0, unitPrice: 10 }] });

      const error = expectErrorResponse(res, { status: 400, code: 'VALIDATION_ERROR' });
      expect(error.details.errors[0].field).to.equal('items[0].quantity');
    });

    it('responde 400 NEGATIVE_VALUE si el precio unitario es negativo', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({ ...validBody(), items: [{ name: 'Caja', quantity: 1, unitPrice: -5 }] });

      expectErrorResponse(res, {
        status: 400,
        code: 'NEGATIVE_VALUE',
        details: { field: 'items[0].unitPrice', value: -5 },
      });
    });

    it('responde 400 INVALID_PRIORITY si la prioridad no es una de las permitidas', async () => {
      const res = await request(app).post('/api/orders').send({ ...validBody(), priority: 'MAXIMA' });

      expectErrorResponse(res, {
        status: 400,
        code: 'INVALID_PRIORITY',
        details: { received: 'MAXIMA', allowed: Object.values(ORDER_PRIORITY) },
      });
    });

    it('responde 400 INVALID_ID si el id del cliente tiene formato inválido', async () => {
      const res = await request(app).post('/api/orders').send({ ...validBody(), customer: MALFORMED_ID });

      expectErrorResponse(res, { status: 400, code: 'INVALID_ID', details: { id: MALFORMED_ID } });
    });

    it('responde 404 USER_NOT_FOUND si el cliente no existe', async () => {
      const res = await request(app).post('/api/orders').send({ ...validBody(), customer: NON_EXISTENT_ID });

      expectErrorResponse(res, {
        status: 404,
        code: 'USER_NOT_FOUND',
        method: 'POST',
        message: new UserNotFoundError(NON_EXISTENT_ID).message,
      });
      expect(await OrderModel.countDocuments({})).to.equal(0);
    });

    it('responde 400 VALIDATION_ERROR si el usuario no tiene rol USER (por ejemplo, un repartidor)', async () => {
      const driver = await createUser({ role: USER_ROLES.DRIVER });

      const res = await request(app).post('/api/orders').send({ ...validBody(), customer: driver._id });

      const error = expectErrorResponse(res, { status: 400, code: 'VALIDATION_ERROR' });
      expect(error.details.errors[0].field).to.equal('customer');
      expect(await OrderModel.countDocuments({})).to.equal(0);
    });

    it('responde 400 INVALID_JSON si el body no es un JSON válido', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Content-Type', 'application/json')
        .send('{"customer": ');

      expectErrorResponse(res, { status: 400, code: 'INVALID_JSON', method: 'POST', path: '/api/orders' });
    });
  });
});
