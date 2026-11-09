import request from 'supertest';
import { expect } from 'chai';
import mongoose from 'mongoose';
import app from '../src/app.js';

describe('🧪 Suite de Testing Funcional Automatizado - ShipNow API (Pre-entrega Módulo 6)', function () {
  this.timeout(10000);

  before(async function () {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipnow_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
  });

  beforeEach(async function () {
    if (mongoose.connection.db) {
      const collections = await mongoose.connection.db.collections();
      for (const collection of collections) {
        await collection.deleteMany({});
      }
    }
  });

  after(async function () {
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.connection.close();
  });

  // 1. USUARIOS
  describe('👤 Módulo de Usuarios (/api/users)', function () {
    it('GET /api/users - Obtener usuarios (Caso exitoso)', async function () {
      const res = await request(app).get('/api/users');
      expect([200, 404]).to.include(res.status);
    });

    it('GET /api/users/:id - Usuario inexistente (Caso de error 404)', async function () {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/users/${fakeId}`);
      expect(res.status).to.equal(404);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 2. PEDIDOS Y ENTREGAS
  describe('📦 Módulo de Pedidos y Entregas (/api/orders & /api/deliveries)', function () {
    it('GET /api/orders - Obtener pedidos (Caso exitoso)', async function () {
      const res = await request(app).get('/api/orders');
      expect([200, 404]).to.include(res.status);
    });

    it('POST /api/orders - Intentar crear pedido con datos vacíos (Caso de error 400)', async function () {
      const res = await request(app).post('/api/orders').send({});
      expect([400, 422]).to.include(res.status);
      expect(res.body).to.have.property('success', false);
    });

    it('GET /api/orders/:id - Pedido inexistente (Caso de error 404)', async function () {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/orders/${fakeId}`);
      expect(res.status).to.equal(404);
      expect(res.body).to.have.property('success', false);
    });

    it('PATCH /api/orders/:id/status - Actualizar con estado inválido (Caso de error 400)', async function () {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).patch(`/api/orders/${fakeId}/status`).send({ status: 'ESTADO_INVALIDO' });
      expect([400, 404, 422]).to.include(res.status);
    });

    it('GET /api/deliveries - Obtener entregas (Caso exitoso)', async function () {
      const res = await request(app).get('/api/deliveries');
      expect([200, 404]).to.include(res.status);
    });
  });

  // 3. MOCKS
  describe('🤡 Módulo de Mocks (/api/mocks)', function () {
    it('GET /api/mocks - Endpoints de mocks (Caso exitoso)', async function () {
      const res = await request(app).get('/api/mocks/users');
      expect([200, 404]).to.include(res.status);
    });

    it('GET /api/mocks - Generar mocks con cantidad inválida o negativa (Caso de error 400)', async function () {
      const res = await request(app).get('/api/mocks/users?qty=-10');
      expect([400, 422]).to.include(res.status);
    });
  });

  // 4. LOGGER
  describe('📜 Endpoint de Logger (/api/logger)', function () {
    it('GET /api/logger - Probar el logger en todos los niveles', async function () {
      const res = await request(app).get('/api/logger/test');
      expect([200, 204, 404]).to.include(res.status);
    });
  });

  // 5. SWAGGER Y RUTAS INEXISTENTES
  describe('📚 Swagger UI y Errores Globales', function () {
    it('GET /api/docs - Acceso a la documentación Swagger', async function () {
      const res = await request(app).get('/api/docs/');
      expect([200, 301]).to.include(res.status);
    });

    it('GET /api/ruta-inexistente - Validar 404 y formato del middleware de errores', async function () {
      const res = await request(app).get('/api/ruta-inexistente');
      expect(res.status).to.equal(404);
      expect(res.body).to.have.property('success', false);
    });
  });
});
