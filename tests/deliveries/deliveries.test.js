import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app.js';
import { USER_ROLES, DELIVERY_STATUS } from '../../src/constants/index.js';
import { DeliveryModel } from '../../src/models/delivery.model.js';
import { DeliveryNotFoundError } from '../../src/errors/domain.errors.js';
import { clearDatabase } from '../helpers/db.js';
import { createUser, createDelivery } from '../helpers/factories.js';
import { expectErrorResponse, expectDelivery } from '../helpers/assertions.js';
import { NON_EXISTENT_ID, MALFORMED_ID } from '../helpers/constants.js';

describe('Deliveries', () => {
  beforeEach(clearDatabase);

  describe('GET /api/deliveries', () => {
    it('devuelve la lista de entregas con la estructura correcta', async () => {
      const driver = await createUser({ role: USER_ROLES.DRIVER });
      const pending = await createDelivery();
      const assigned = await createDelivery({ driver: driver._id, status: DELIVERY_STATUS.ASSIGNED });

      const res = await request(app).get('/api/deliveries');

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
      expect(res.body).to.have.lengthOf(2);
      res.body.forEach(expectDelivery);
      expect(res.body.map((delivery) => delivery._id).sort()).to.eql([pending._id, assigned._id].sort());
      expect(res.body.find((delivery) => delivery._id === assigned._id).driver).to.equal(driver._id);
      expect(res.body.find((delivery) => delivery._id === pending._id).driver).to.equal(null);
    });

    it('devuelve una lista vacía cuando no hay entregas', async () => {
      const res = await request(app).get('/api/deliveries');

      expect(res.status).to.equal(200);
      expect(res.body).to.eql([]);
    });
  });

  describe('GET /api/deliveries/:id', () => {
    it('devuelve la entrega asociada a su pedido', async () => {
      const delivery = await createDelivery();

      const res = await request(app).get(`/api/deliveries/${delivery._id}`);

      expect(res.status).to.equal(200);
      expectDelivery(res.body);
      expect(res.body._id).to.equal(delivery._id);
      expect(res.body.order).to.equal(delivery.order);
      expect(res.body.status).to.equal(DELIVERY_STATUS.PENDING);
    });

    it('responde 404 DELIVERY_NOT_FOUND si la entrega no existe', async () => {
      const path = `/api/deliveries/${NON_EXISTENT_ID}`;
      const res = await request(app).get(path);

      expectErrorResponse(res, {
        status: 404,
        code: 'DELIVERY_NOT_FOUND',
        method: 'GET',
        path,
        message: new DeliveryNotFoundError(NON_EXISTENT_ID).message,
      });
    });

    it('responde 400 INVALID_ID si el id tiene formato inválido', async () => {
      const res = await request(app).get(`/api/deliveries/${MALFORMED_ID}`);

      expectErrorResponse(res, { status: 400, code: 'INVALID_ID', details: { id: MALFORMED_ID } });
    });
  });

  describe('PATCH /api/deliveries/:id/status', () => {
    let driver;
    let delivery;
    const statusPath = () => `/api/deliveries/${delivery._id}/status`;

    beforeEach(async () => {
      driver = await createUser({ role: USER_ROLES.DRIVER });
      delivery = await createDelivery(); // entrega PENDING, sin repartidor
    });

    it('asigna un repartidor y pasa la entrega a ASSIGNED', async () => {
      const res = await request(app)
        .patch(statusPath())
        .send({ status: DELIVERY_STATUS.ASSIGNED, driver: driver._id });

      expect(res.status).to.equal(200);
      expectDelivery(res.body);
      expect(res.body.status).to.equal(DELIVERY_STATUS.ASSIGNED);
      expect(res.body.driver).to.equal(driver._id);
      expect(res.body.deliveredAt).to.equal(null);
      expect(res.body.order).to.equal(delivery.order);
    });

    it('conserva el repartidor al pasar a IN_TRANSIT sin enviarlo de nuevo', async () => {
      await request(app).patch(statusPath()).send({ status: DELIVERY_STATUS.ASSIGNED, driver: driver._id });

      const res = await request(app).patch(statusPath()).send({ status: DELIVERY_STATUS.IN_TRANSIT });

      expect(res.status).to.equal(200);
      expectDelivery(res.body);
      expect(res.body.status).to.equal(DELIVERY_STATUS.IN_TRANSIT);
      expect(res.body.driver).to.equal(driver._id);
    });

    it('registra deliveredAt al pasar a DELIVERED y no lo pisa si se repite', async () => {
      await request(app).patch(statusPath()).send({ status: DELIVERY_STATUS.ASSIGNED, driver: driver._id });

      const first = await request(app).patch(statusPath()).send({ status: DELIVERY_STATUS.DELIVERED });
      expect(first.status).to.equal(200);
      expectDelivery(first.body);
      expect(first.body.status).to.equal(DELIVERY_STATUS.DELIVERED);
      expect(first.body.deliveredAt).to.be.a('string');

      const second = await request(app).patch(statusPath()).send({ status: DELIVERY_STATUS.DELIVERED });
      expect(second.status).to.equal(200);
      expect(second.body.deliveredAt).to.equal(first.body.deliveredAt);
    });

    it('al volver a PENDING quita el repartidor y la fecha de entrega', async () => {
      await request(app).patch(statusPath()).send({ status: DELIVERY_STATUS.ASSIGNED, driver: driver._id });
      await request(app).patch(statusPath()).send({ status: DELIVERY_STATUS.DELIVERED });

      const res = await request(app).patch(statusPath()).send({ status: DELIVERY_STATUS.PENDING });

      expect(res.status).to.equal(200);
      expectDelivery(res.body);
      expect(res.body.status).to.equal(DELIVERY_STATUS.PENDING);
      expect(res.body.driver).to.equal(null);
      expect(res.body.deliveredAt).to.equal(null);
    });

    it('responde 400 INVALID_STATUS si el estado no es uno de los permitidos', async () => {
      const res = await request(app).patch(statusPath()).send({ status: 'ENVIADA' });

      expectErrorResponse(res, {
        status: 400,
        code: 'INVALID_STATUS',
        method: 'PATCH',
        path: statusPath(),
        details: { received: 'ENVIADA', allowed: Object.values(DELIVERY_STATUS) },
      });
      const stored = await DeliveryModel.findById(delivery._id).lean();
      expect(stored.status).to.equal(DELIVERY_STATUS.PENDING);
    });

    it('responde 400 VALIDATION_ERROR si no se envía el estado', async () => {
      const res = await request(app).patch(statusPath()).send({});

      const error = expectErrorResponse(res, { status: 400, code: 'VALIDATION_ERROR' });
      expect(error.details.errors.map((e) => e.field)).to.eql(['status']);
    });

    [DELIVERY_STATUS.ASSIGNED, DELIVERY_STATUS.IN_TRANSIT, DELIVERY_STATUS.DELIVERED].forEach((status) => {
      it(`responde 400 VALIDATION_ERROR si se pasa a ${status} sin repartidor`, async () => {
        const res = await request(app).patch(statusPath()).send({ status });

        const error = expectErrorResponse(res, { status: 400, code: 'VALIDATION_ERROR' });
        expect(error.details.errors[0].field).to.equal('driver');
      });
    });

    it('responde 400 VALIDATION_ERROR si se envía un repartidor con estado PENDING', async () => {
      const res = await request(app)
        .patch(statusPath())
        .send({ status: DELIVERY_STATUS.PENDING, driver: driver._id });

      const error = expectErrorResponse(res, { status: 400, code: 'VALIDATION_ERROR' });
      expect(error.details.errors[0].field).to.equal('driver');
    });

    it('responde 400 VALIDATION_ERROR si el usuario indicado no tiene rol DRIVER', async () => {
      const client = await createUser({ role: USER_ROLES.USER });

      const res = await request(app)
        .patch(statusPath())
        .send({ status: DELIVERY_STATUS.ASSIGNED, driver: client._id });

      const error = expectErrorResponse(res, { status: 400, code: 'VALIDATION_ERROR' });
      expect(error.details.errors[0].field).to.equal('driver');
      const stored = await DeliveryModel.findById(delivery._id).lean();
      expect(stored.driver).to.equal(null);
    });

    it('responde 404 USER_NOT_FOUND si el repartidor no existe', async () => {
      const res = await request(app)
        .patch(statusPath())
        .send({ status: DELIVERY_STATUS.ASSIGNED, driver: NON_EXISTENT_ID });

      expectErrorResponse(res, { status: 404, code: 'USER_NOT_FOUND', details: { id: NON_EXISTENT_ID } });
    });

    it('responde 400 INVALID_ID si el id del repartidor tiene formato inválido', async () => {
      const res = await request(app)
        .patch(statusPath())
        .send({ status: DELIVERY_STATUS.ASSIGNED, driver: MALFORMED_ID });

      expectErrorResponse(res, { status: 400, code: 'INVALID_ID', details: { id: MALFORMED_ID } });
    });

    it('responde 404 DELIVERY_NOT_FOUND si la entrega no existe', async () => {
      const res = await request(app)
        .patch(`/api/deliveries/${NON_EXISTENT_ID}/status`)
        .send({ status: DELIVERY_STATUS.PENDING });

      expectErrorResponse(res, { status: 404, code: 'DELIVERY_NOT_FOUND', method: 'PATCH' });
    });

    it('responde 400 INVALID_ID si el id de la entrega tiene formato inválido', async () => {
      const res = await request(app)
        .patch(`/api/deliveries/${MALFORMED_ID}/status`)
        .send({ status: DELIVERY_STATUS.PENDING });

      expectErrorResponse(res, { status: 400, code: 'INVALID_ID', method: 'PATCH' });
    });
  });
});
