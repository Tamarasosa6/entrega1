// Coherencia con Swagger: lo que documenta src/docs se ejecuta contra la API real.
// Si un comportamiento documentado (un 404, un ejemplo de body, la forma de una respuesta)
// deja de cumplirse, estos tests fallan.
import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app.js';
import { openApiSpec as spec } from '../../src/docs/openapi.js';
import { ERROR_DICTIONARY } from '../../src/errors/error.dictionary.js';
import { ORDER_STATUS, DELIVERY_STATUS, MOCK_CONFIG } from '../../src/constants/index.js';
import { clearDatabase } from '../helpers/db.js';
import { expectErrorResponse } from '../helpers/assertions.js';
import { NON_EXISTENT_ID, MALFORMED_ID } from '../helpers/constants.js';

const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

const operations = [];
Object.entries(spec.paths).forEach(([path, item]) => {
  METHODS.filter((method) => item[method]).forEach((method) => {
    operations.push({ method, path, operation: item[method], label: `${method.toUpperCase()} ${path}` });
  });
});

const byId = (operationId) => operations.find(({ operation }) => operation.operationId === operationId);
const resolveRef = (schema) => (schema.$ref ? spec.components.schemas[schema.$ref.split('/').pop()] : schema);
const responseSchema = (operationId, status) =>
  resolveRef(byId(operationId).operation.responses[status].content['application/json'].schema);
const send = (method, url, body) => {
  const req = request(app)[method](url);
  return body === undefined ? req : req.send(body);
};

// Cuerpos mínimos válidos para llegar hasta la validación del id
const BODIES = {
  updateProduct: { price: 1 },
  updateUser: { name: 'Nombre' },
  updateOrderStatus: { status: ORDER_STATUS.PENDING },
  updateDeliveryStatus: { status: DELIVERY_STATUS.PENDING },
};

// Código de "no encontrado" que corresponde al recurso de cada tag
const NOT_FOUND_CODE_BY_TAG = {
  Users: 'USER_NOT_FOUND',
  Products: 'PRODUCT_NOT_FOUND',
  Orders: 'ORDER_NOT_FOUND',
  Deliveries: 'DELIVERY_NOT_FOUND',
};

// La respuesta real de error cumple el schema ErrorResponse documentado
function expectMatchesErrorSchema(body) {
  const schema = spec.components.schemas.ErrorResponse;
  schema.required.forEach((key) => expect(body).to.have.property(key));
  expect(body.success).to.equal(schema.properties.success.enum[0]);

  const errorSchema = schema.properties.error;
  errorSchema.required.forEach((key) => expect(body.error).to.have.property(key));
  expect(Object.keys(body.error).sort()).to.eql(Object.keys(errorSchema.properties).sort());
  expect(errorSchema.properties.code.enum).to.include(body.error.code);
}

const sortedKeys = (object) => Object.keys(object).sort();

describe('Swagger - coherencia entre la documentación y la API', () => {
  beforeEach(clearDatabase);

  describe('los errores documentados coinciden con el diccionario de errores', () => {
    operations.forEach(({ label, operation }) => {
      Object.entries(operation.responses)
        .filter(([status]) => Number(status) >= 400)
        .forEach(([status, response]) => {
          it(`${label} → ${status}`, () => {
            const examples = Object.entries(response.content['application/json'].examples);
            expect(examples.length).to.be.above(0);
            examples.forEach(([, example]) => {
              const { code, status: exampleStatus } = example.value.error;
              expect(ERROR_DICTIONARY[code], `código ${code} en el diccionario`).to.not.equal(undefined);
              expect(ERROR_DICTIONARY[code].status).to.equal(Number(status));
              expect(exampleStatus).to.equal(Number(status));
              expect(example.value.success).to.equal(false);
            });
          });
        });
    });
  });

  describe('todas las rutas documentadas existen en la API', () => {
    operations.forEach(({ method, path, label }) => {
      it(label, async () => {
        // Sin efectos secundarios: el seed va con qty inválida y los demás con datos vacíos
        const query = path === '/api/mocks/seed' ? '?qty=0' : '';
        const url = `${path.replace('{id}', NON_EXISTENT_ID)}${query}`;

        const res = await send(method, url, ['post', 'put', 'patch'].includes(method) ? {} : undefined);

        const code = res.body && res.body.error && res.body.error.code;
        expect(code).to.not.equal('ROUTE_NOT_FOUND');
      });
    });
  });

  describe('errores documentados para endpoints con :id', () => {
    operations
      .filter(({ path }) => path.includes('{id}'))
      .forEach(({ method, path, operation, label }) => {
        const body = BODIES[operation.operationId];
        const documented400 = operation.responses[400].content['application/json'].examples;
        const notFoundCode = NOT_FOUND_CODE_BY_TAG[operation.tags[0]];
        const documented404 = operation.responses[404]?.content['application/json'].examples ?? {};

        if (documented400.INVALID_ID) {
          it(`${label} → 400 INVALID_ID con un id mal formado`, async () => {
            const url = path.replace('{id}', MALFORMED_ID);
            const res = await send(method, url, body);

            expectErrorResponse(res, { status: 400, code: 'INVALID_ID', method: method.toUpperCase(), path: url });
            expectMatchesErrorSchema(res.body);
          });
        }

        if (documented404[notFoundCode]) {
          it(`${label} → 404 ${notFoundCode} con un id inexistente`, async () => {
            const url = path.replace('{id}', NON_EXISTENT_ID);
            const res = await send(method, url, body);

            expectErrorResponse(res, { status: 404, code: notFoundCode, method: method.toUpperCase(), path: url });
            expectMatchesErrorSchema(res.body);
          });
        }
      });
  });

  describe('los errores de datos inválidos cumplen el schema ErrorResponse', () => {
    [
      ['post', '/api/users', {}, 'VALIDATION_ERROR'],
      ['post', '/api/products', { name: 'Caja', price: -1 }, 'NEGATIVE_VALUE'],
      ['post', '/api/orders', {}, 'VALIDATION_ERROR'],
      ['post', '/api/mocks/seed?qty=0', undefined, 'INVALID_QUANTITY'],
      ['get', '/api/mocks/users?qty=-1', undefined, 'NEGATIVE_VALUE'],
      ['get', '/api/mocks/orders?status=NADA', undefined, 'INVALID_STATUS'],
      ['get', '/api/nada', undefined, 'ROUTE_NOT_FOUND'],
    ].forEach(([method, url, body, code]) => {
      it(`${method.toUpperCase()} ${url} → ${code}`, async () => {
        const res = await send(method, url, body);

        expect(res.body.error.code).to.equal(code);
        expectMatchesErrorSchema(res.body);
      });
    });
  });

  describe('los ejemplos de body documentados son aceptados por la API', () => {
    ['createProduct', 'createUser'].forEach((operationId) => {
      const { method, path, operation, label } = byId(operationId);

      it(`${label}: el ejemplo documentado crea el recurso y la respuesta coincide con el schema`, async () => {
        const example = operation.requestBody.content['application/json'].example;

        const res = await send(method, path, example);

        expect(res.status).to.equal(201);
        const schema = responseSchema(operationId, 201);
        sortedKeys(res.body).forEach((key) => expect(schema.properties).to.have.property(key));
        Object.keys(example)
          .filter((key) => key !== 'password')
          .forEach((key) => expect(res.body[key]).to.equal(example[key]));
      });
    });
  });

  describe('las respuestas exitosas tienen la forma documentada', () => {
    [
      ['listUsers', '/api/users'],
      ['listProducts', '/api/products'],
      ['listOrders', '/api/orders'],
      ['listDeliveries', '/api/deliveries'],
    ].forEach(([operationId, url]) => {
      it(`${operationId}: responde 200 con un array, como indica el schema`, async () => {
        const res = await request(app).get(url);

        expect(res.status).to.equal(200);
        expect(responseSchema(operationId, 200).type).to.equal('array');
        expect(res.body).to.be.an('array');
      });
    });

    it('getMockUsers: cada usuario simulado tiene exactamente las propiedades del schema MockUser', async () => {
      const res = await request(app).get('/api/mocks/users?qty=5');
      const schema = spec.components.schemas.MockUser;

      expect(res.status).to.equal(200);
      res.body.forEach((user) => expect(sortedKeys(user)).to.eql(sortedKeys(schema.properties)));
    });

    it('getMockOrders: cada pedido simulado tiene exactamente las propiedades del schema MockOrder', async () => {
      const res = await request(app).get('/api/mocks/orders?qty=5');
      const schema = spec.components.schemas.MockOrder;

      res.body.forEach((order) => expect(sortedKeys(order)).to.eql(sortedKeys(schema.properties)));
    });

    it('getMockDeliveries: cada entrega simulada tiene exactamente las propiedades del schema MockDelivery', async () => {
      const res = await request(app).get('/api/mocks/deliveries?qty=30');
      const schema = spec.components.schemas.MockDelivery;

      expect(res.body.length).to.be.above(0);
      res.body.forEach((delivery) => expect(sortedKeys(delivery)).to.eql(sortedKeys(schema.properties)));
    });

    it('getMockDataset: tiene las secciones del schema MockDataset', async () => {
      const res = await request(app).get('/api/mocks/dataset?qty=5');

      expect(sortedKeys(res.body)).to.eql(sortedKeys(spec.components.schemas.MockDataset.properties));
    });

    it('seedMocks: las respuestas coinciden con los ejemplos documentados', async () => {
      const examples = byId('seedMocks').operation.responses[201].content['application/json'].examples;

      const single = await request(app).post('/api/mocks/seed?qty=2');
      expect(single.status).to.equal(201);
      expect(sortedKeys(single.body)).to.eql(sortedKeys(examples.coleccion.value));
      expect(single.body.coleccion).to.equal('users');

      const all = await request(app).post('/api/mocks/seed?qty=3&entity=all');
      expect(all.status).to.equal(201);
      expect(sortedKeys(all.body)).to.eql(sortedKeys(examples.all.value));
      expect(sortedKeys(all.body.colecciones)).to.eql(sortedKeys(examples.all.value.colecciones));
    });

    it('testLogger: la respuesta tiene exactamente las propiedades del schema LoggerTestResult', async () => {
      const res = await request(app).get('/api/logger/test');

      expect(sortedKeys(res.body)).to.eql(sortedKeys(spec.components.schemas.LoggerTestResult.properties));
    });
  });

  describe('los parámetros documentados coinciden con lo que la API valida', () => {
    it('qty está documentado con el mismo rango y valor por defecto que usa la API', () => {
      const { schema } = spec.components.parameters.QtyParam;

      expect(schema.minimum).to.equal(MOCK_CONFIG.MIN_QTY);
      expect(schema.maximum).to.equal(MOCK_CONFIG.MAX_QTY);
      expect(schema.default).to.equal(MOCK_CONFIG.DEFAULT_QTY);
    });

    it('los valores documentados para qty se aceptan en los extremos y se rechazan fuera de rango', async () => {
      const { schema } = spec.components.parameters.QtyParam;

      expect((await request(app).get(`/api/mocks/users?qty=${schema.minimum}`)).status).to.equal(200);
      expect((await request(app).get(`/api/mocks/users?qty=${schema.maximum}`)).status).to.equal(200);
      expect((await request(app).get(`/api/mocks/users?qty=${schema.minimum - 1}`)).status).to.equal(400);
      expect((await request(app).get(`/api/mocks/users?qty=${schema.maximum + 1}`)).status).to.equal(400);
    });
  });
});
