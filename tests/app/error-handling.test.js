import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app.js';
import { UserModel } from '../../src/models/user.model.js';
import { ProductModel } from '../../src/models/product.model.js';
import { clearDatabase } from '../helpers/db.js';
import { stubMethod, mongoDuplicateKeyError, mongoUnavailableError } from '../helpers/stubs.js';
import { expectErrorResponse } from '../helpers/assertions.js';

// Errores inesperados o de infraestructura: la respuesta sigue el mismo formato
// y nunca expone detalles internos al cliente.
describe('App - errores del servidor y de la base de datos', () => {
  let restoreStubs;

  beforeEach(async () => {
    restoreStubs = [];
    await clearDatabase();
  });

  afterEach(() => {
    restoreStubs.forEach((restore) => restore());
  });

  it('un error inesperado responde 500 INTERNAL_ERROR sin filtrar el detalle', async () => {
    restoreStubs.push(
      stubMethod(ProductModel, 'find', () => {
        throw new Error('fallo inesperado con password=1234');
      })
    );

    const res = await request(app).get('/api/products');

    expectErrorResponse(res, {
      status: 500,
      code: 'INTERNAL_ERROR',
      method: 'GET',
      path: '/api/products',
      message: 'Error interno del servidor.',
      details: null,
    });
    expect(JSON.stringify(res.body)).to.not.include('password=1234');
  });

  it('una base de datos caída responde 503 DATABASE_UNAVAILABLE sin filtrar el detalle', async () => {
    restoreStubs.push(
      stubMethod(UserModel, 'find', () => {
        throw mongoUnavailableError();
      })
    );

    const res = await request(app).get('/api/users');

    expectErrorResponse(res, {
      status: 503,
      code: 'DATABASE_UNAVAILABLE',
      method: 'GET',
      path: '/api/users',
      details: null,
    });
    expect(JSON.stringify(res.body)).to.not.include('ECONNREFUSED');
    expect(JSON.stringify(res.body)).to.not.include('secreto');
  });

  it('una clave duplicada que llega desde la base responde 409 DUPLICATE_KEY', async () => {
    restoreStubs.push(
      stubMethod(UserModel, 'create', async () => {
        throw mongoDuplicateKeyError();
      })
    );

    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Ana', email: 'ana.duplicada@mail.com', password: 'secreto123' });

    expectErrorResponse(res, {
      status: 409,
      code: 'DUPLICATE_KEY',
      method: 'POST',
      details: { fields: { email: 'duplicado@test.com' } },
    });
    expect(JSON.stringify(res.body)).to.not.include('E11000');
  });
});
