import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app.js';
import { expectErrorResponse } from '../helpers/assertions.js';

describe('App - rutas generales y formato de errores', () => {
  describe('GET /health', () => {
    it('responde 200 con el estado del servidor', async () => {
      const res = await request(app).get('/health');

      expect(res.status).to.equal(200);
      expect(res.body).to.eql({ status: 'ok' });
    });
  });

  describe('ruta inexistente → 404 ROUTE_NOT_FOUND', () => {
    it('GET sobre una ruta que no existe', async () => {
      const path = '/api/nada';
      const res = await request(app).get(path);

      expectErrorResponse(res, {
        status: 404,
        code: 'ROUTE_NOT_FOUND',
        method: 'GET',
        path,
        message: 'Ruta no encontrada: GET /api/nada',
        details: { method: 'GET', path },
      });
    });

    it('mantiene el query string en el path informado', async () => {
      const res = await request(app).get('/api/nada?x=1');

      const error = expectErrorResponse(res, { status: 404, code: 'ROUTE_NOT_FOUND' });
      expect(error.path).to.equal('/api/nada?x=1');
    });

    it('responde igual para otros métodos HTTP', async () => {
      const post = await request(app).post('/api/nada').send({});
      const del = await request(app).delete('/api/nada');

      expectErrorResponse(post, { status: 404, code: 'ROUTE_NOT_FOUND', method: 'POST' });
      expectErrorResponse(del, { status: 404, code: 'ROUTE_NOT_FOUND', method: 'DELETE' });
    });

    it('una subruta inexistente de un recurso existente también es ROUTE_NOT_FOUND', async () => {
      const res = await request(app).get('/api/users/abc/extra');

      expectErrorResponse(res, { status: 404, code: 'ROUTE_NOT_FOUND', method: 'GET' });
    });

    it('un método no soportado sobre una ruta existente es ROUTE_NOT_FOUND', async () => {
      const res = await request(app).patch('/api/users');

      expectErrorResponse(res, { status: 404, code: 'ROUTE_NOT_FOUND', method: 'PATCH', path: '/api/users' });
    });
  });

  describe('JSON mal formado → 400 INVALID_JSON', () => {
    it('lo detecta antes de llegar a cualquier controller', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Content-Type', 'application/json')
        .send('{malo');

      expectErrorResponse(res, {
        status: 400,
        code: 'INVALID_JSON',
        method: 'POST',
        path: '/api/products',
        details: null,
      });
    });
  });
});
