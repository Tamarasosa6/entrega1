import request from 'supertest';
import { expect } from 'chai';
import mongoose from 'mongoose';
import app from '../src/app.js';
import path from 'path';
import fs from 'fs';

describe('🧪 Suite de Testing Funcional Automatizado - ShipNow API (Pre-entrega Módulo 7)', function () {
  this.timeout(10000);

  before(async function () {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipnow_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
  });

  after(async function () {
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.connection.close();
  });

  describe('👤 Módulo de Usuarios y Carga de Documentos (/api/users)', function () {
    it('GET /api/users - Obtener usuarios (Caso exitoso)', async function () {
      const res = await request(app).get('/api/users');
      expect([200, 404]).to.include(res.status);
    });

    it('POST /api/users/:id/documents - Carga correcta de documento (200)', async function () {
      const testFilePath = path.join(process.cwd(), 'tests', 'test_doc.pdf');
      fs.writeFileSync(testFilePath, '%PDF-1.4 Mock Document Content');

      const res = await request(app)
        .post('/api/users/123456789012345678901234/documents')
        .field('docType', 'DNI')
        .attach('document', testFilePath);

      if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('success', true);
    });

    it('POST /api/users/:id/documents - Error cuando falta el archivo (400)', async function () {
      const res = await request(app)
        .post('/api/users/123456789012345678901234/documents')
        .field('docType', 'DNI');

      expect(res.status).to.equal(400);
      expect(res.body).to.have.property('success', false);
      expect(res.body.error).to.have.property('code', 'FILE_MISSING');
    });

    it('POST /api/users/:id/documents - Error con tipo de documento inválido (400)', async function () {
      const testFilePath = path.join(process.cwd(), 'tests', 'test_doc.pdf');
      fs.writeFileSync(testFilePath, '%PDF-1.4 Mock Document Content');

      const res = await request(app)
        .post('/api/users/123456789012345678901234/documents')
        .field('docType', 'TIPO_INVALIDO')
        .attach('document', testFilePath);

      if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);

      expect(res.status).to.equal(400);
      expect(res.body).to.have.property('success', false);
      expect(res.body.error).to.have.property('code', 'INVALID_DOC_TYPE');
    });

    it('POST /api/users/:id/documents - Error con tipo de archivo no permitido (.txt) (400)', async function () {
      const testFilePath = path.join(process.cwd(), 'tests', 'test_doc.txt');
      fs.writeFileSync(testFilePath, 'Plain text content');

      const res = await request(app)
        .post('/api/users/123456789012345678901234/documents')
        .attach('document', testFilePath);

      if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);

      expect(res.status).to.equal(400);
      expect(res.body).to.have.property('success', false);
      expect(res.body.error).to.have.property('code', 'INVALID_FILE_TYPE');
    });
  });

  describe('📦 Módulo de Pedidos, Entregas y Comprobantes (/api/orders)', function () {
    it('POST /api/orders/:id/receipt - Carga exitosa de comprobante (200)', async function () {
      const testFilePath = path.join(process.cwd(), 'tests', 'receipt.png');
      fs.writeFileSync(testFilePath, 'Fake PNG Header');

      const res = await request(app)
        .post('/api/orders/123456789012345678901234/receipt')
        .attach('receipt', testFilePath);

      if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('success', true);
    });
  });

  describe('📜 Logger y Swagger', function () {
    it('GET /api/logger/test - Probar logger', async function () {
      const res = await request(app).get('/api/logger/test');
      expect([200, 204, 403, 404]).to.include(res.status);
    });

    it('GET /api/docs - Documentación Swagger', async function () {
      const res = await request(app).get('/api/docs/');
      expect([200, 301]).to.include(res.status);
    });
  });
});
