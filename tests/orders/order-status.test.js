import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app.js';
import { ORDER_STATUS } from '../../src/constants/index.js';
import { OrderModel } from '../../src/models/order.model.js';
import { clearDatabase } from '../helpers/db.js';
import { createOrder } from '../helpers/factories.js';
import { expectErrorResponse, expectOrder } from '../helpers/assertions.js';
import { NON_EXISTENT_ID, MALFORMED_ID } from '../helpers/constants.js';

describe('Orders - PATCH /api/orders/:id/status', () => {
  beforeEach(clearDatabase);

  Object.values(ORDER_STATUS).forEach((status) => {
    it(`cambia el estado del pedido a ${status}`, async () => {
      // Se parte siempre de un estado distinto al que se prueba
      const startingStatus = status === ORDER_STATUS.PENDING ? ORDER_STATUS.IN_PROGRESS : ORDER_STATUS.PENDING;
      const order = await createOrder({ status: startingStatus });

      const res = await request(app).patch(`/api/orders/${order._id}/status`).send({ status });

      expect(res.status).to.equal(200);
      expectOrder(res.body);
      expect(res.body._id).to.equal(order._id);
      expect(res.body.status).to.equal(status);
      // El resto del pedido no cambia
      expect(res.body.total).to.equal(order.total);
      expect(res.body.priority).to.equal(order.priority);
      expect(res.body.customer).to.equal(order.customer);

      const stored = await OrderModel.findById(order._id).lean();
      expect(stored.status).to.equal(status);
    });
  });

  it('responde 400 INVALID_STATUS si el estado no es uno de los permitidos', async () => {
    const order = await createOrder();
    const path = `/api/orders/${order._id}/status`;

    const res = await request(app).patch(path).send({ status: 'ENVIADO' });

    const error = expectErrorResponse(res, {
      status: 400,
      code: 'INVALID_STATUS',
      method: 'PATCH',
      path,
      details: { received: 'ENVIADO', allowed: Object.values(ORDER_STATUS) },
    });
    expect(error.message).to.include('ENVIADO');

    const stored = await OrderModel.findById(order._id).lean();
    expect(stored.status).to.equal(ORDER_STATUS.PENDING); // no se modificó
  });

  it('responde 400 VALIDATION_ERROR si no se envía el estado', async () => {
    const order = await createOrder();

    const res = await request(app).patch(`/api/orders/${order._id}/status`).send({});

    const error = expectErrorResponse(res, { status: 400, code: 'VALIDATION_ERROR' });
    expect(error.details.errors.map((e) => e.field)).to.eql(['status']);
  });

  it('responde 404 ORDER_NOT_FOUND si el pedido no existe', async () => {
    const res = await request(app)
      .patch(`/api/orders/${NON_EXISTENT_ID}/status`)
      .send({ status: ORDER_STATUS.DELIVERED });

    expectErrorResponse(res, { status: 404, code: 'ORDER_NOT_FOUND', method: 'PATCH' });
  });

  it('responde 400 INVALID_ID si el id tiene formato inválido', async () => {
    const res = await request(app)
      .patch(`/api/orders/${MALFORMED_ID}/status`)
      .send({ status: ORDER_STATUS.DELIVERED });

    expectErrorResponse(res, { status: 400, code: 'INVALID_ID', method: 'PATCH' });
  });

  it('responde 400 INVALID_JSON si el body no es un JSON válido', async () => {
    const order = await createOrder();

    const res = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set('Content-Type', 'application/json')
      .send('{"status": ');

    expectErrorResponse(res, { status: 400, code: 'INVALID_JSON' });
  });
});
