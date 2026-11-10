import { readFileSync } from 'node:fs';
import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app.js';

const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

describe('Swagger - documentación de la API', () => {
  describe('GET /api/docs/ (Swagger UI)', () => {
    it('sirve la interfaz de Swagger UI como HTML', async () => {
      const res = await request(app).get('/api/docs/');

      expect(res.status).to.equal(200);
      expect(res.headers['content-type']).to.match(/text\/html/);
      expect(res.text).to.include('swagger-ui');
      expect(res.text).to.include('ShipNow API');
    });

    it('GET /api/docs (sin la barra final) responde o redirige a /api/docs/', async () => {
      const res = await request(app).get('/api/docs');

      expect([200, 301, 302, 303, 307, 308]).to.include(res.status);
      if (res.status !== 200) expect(res.headers.location).to.match(/\/api\/docs\/$/);
    });
  });

  describe('GET /api/docs/json (especificación OpenAPI)', () => {
    let spec;

    before(async () => {
      const res = await request(app).get('/api/docs/json');
      expect(res.status).to.equal(200);
      expect(res.headers['content-type']).to.match(/application\/json/);
      spec = res.body;
    });

    it('es una especificación OpenAPI 3 con la información general de la API', () => {
      expect(spec.openapi).to.match(/^3\.0\./);
      expect(spec.info.title).to.equal('ShipNow API');
      expect(spec.info.version).to.equal(version);
      expect(spec.info.description).to.be.a('string');
      expect(spec.info.description.length).to.be.above(0);
    });

    it('declara el servidor local', () => {
      expect(spec.servers).to.be.an('array');
      expect(spec.servers[0].url).to.match(/^http:\/\/localhost:\d+$/);
    });

    it('agrupa los endpoints por tags: Users, Orders, Deliveries, Mocks y Logger', () => {
      const tags = spec.tags.map((tag) => tag.name);
      ['Users', 'Orders', 'Deliveries', 'Mocks', 'Logger'].forEach((tag) => expect(tags).to.include(tag));
      Object.values(spec.paths).forEach((pathItem) => {
        Object.entries(pathItem)
          .filter(([key]) => ['get', 'post', 'put', 'patch', 'delete'].includes(key))
          .forEach(([, operation]) => {
            expect(operation.tags).to.have.lengthOf(1);
            expect(tags).to.include(operation.tags[0]);
          });
      });
    });

    it('documenta los endpoints principales', () => {
      expect(spec.paths['/api/users']).to.have.property('get');
      expect(spec.paths['/api/orders']).to.have.property('get');
      expect(spec.paths['/api/orders']).to.have.property('post');
      expect(spec.paths['/api/orders/{id}']).to.have.property('get');
      expect(spec.paths['/api/orders/{id}/status']).to.have.property('patch');
      expect(spec.paths['/api/deliveries']).to.have.property('get');
      expect(spec.paths['/api/deliveries/{id}/status']).to.have.property('patch');
      expect(spec.paths['/api/mocks/users']).to.have.property('get');
      expect(spec.paths['/api/mocks/seed']).to.have.property('post');
      expect(spec.paths['/api/logger/test']).to.have.property('get');
    });

    it('define los schemas reutilizables', () => {
      ['User', 'Order', 'OrderItem', 'Delivery', 'ErrorResponse', 'SuccessMessage'].forEach((name) => {
        expect(spec.components.schemas).to.have.property(name);
      });
    });

    it('el endpoint del logger se documenta como herramienta de validación', () => {
      const description = spec.paths['/api/logger/test'].get.description.toLowerCase();

      expect(description).to.include('herramienta');
      expect(description).to.include('no es una funcionalidad de negocio');
    });
  });
});
