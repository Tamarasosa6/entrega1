import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app.js';
import { PRODUCT_STATUS } from '../../src/constants/index.js';
import { ProductModel } from '../../src/models/product.model.js';
import { clearDatabase } from '../helpers/db.js';
import { createProduct } from '../helpers/factories.js';
import { expectErrorResponse, expectProduct } from '../helpers/assertions.js';
import { NON_EXISTENT_ID, MALFORMED_ID } from '../helpers/constants.js';

describe('Products', () => {
  beforeEach(clearDatabase);

  describe('GET /api/products', () => {
    it('lista solo los productos con stock disponible', async () => {
      const available = await createProduct({ name: 'Con stock', stock: 5 });
      await createProduct({ name: 'Sin stock', stock: 0 });

      const res = await request(app).get('/api/products');

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
      expect(res.body).to.have.lengthOf(1);
      expectProduct(res.body[0]);
      expect(res.body[0]._id).to.equal(available._id);
      expect(res.body[0].status).to.equal(PRODUCT_STATUS.AVAILABLE);
    });
  });

  describe('GET /api/products/:id', () => {
    it('devuelve el producto pedido, aunque no tenga stock', async () => {
      const product = await createProduct({ stock: 0 });

      const res = await request(app).get(`/api/products/${product._id}`);

      expect(res.status).to.equal(200);
      expectProduct(res.body);
      expect(res.body.status).to.equal(PRODUCT_STATUS.OUT_OF_STOCK);
    });

    it('responde 404 PRODUCT_NOT_FOUND si no existe', async () => {
      const res = await request(app).get(`/api/products/${NON_EXISTENT_ID}`);

      expectErrorResponse(res, { status: 404, code: 'PRODUCT_NOT_FOUND', method: 'GET' });
    });

    it('responde 400 INVALID_ID si el id tiene formato inválido', async () => {
      const res = await request(app).get(`/api/products/${MALFORMED_ID}`);

      expectErrorResponse(res, { status: 400, code: 'INVALID_ID' });
    });
  });

  describe('POST /api/products', () => {
    it('crea un producto AVAILABLE cuando tiene stock', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({ name: 'Caja chica', description: '20x20', price: 1500, stock: 10 });

      expect(res.status).to.equal(201);
      expectProduct(res.body);
      expect(res.body.name).to.equal('Caja chica');
      expect(res.body.price).to.equal(1500);
      expect(res.body.stock).to.equal(10);
      expect(res.body.status).to.equal(PRODUCT_STATUS.AVAILABLE);
      expect(await ProductModel.countDocuments({})).to.equal(1);
    });

    it('calcula el estado OUT_OF_STOCK cuando no se envía stock, e ignora el estado enviado', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({ name: 'Sobre', price: 100, status: PRODUCT_STATUS.AVAILABLE });

      expect(res.status).to.equal(201);
      expect(res.body.stock).to.equal(0);
      expect(res.body.status).to.equal(PRODUCT_STATUS.OUT_OF_STOCK);
    });

    it('responde 400 VALIDATION_ERROR si faltan datos', async () => {
      const res = await request(app).post('/api/products').send({});

      const error = expectErrorResponse(res, { status: 400, code: 'VALIDATION_ERROR', method: 'POST', path: '/api/products' });
      expect(error.details.errors.map((e) => e.field)).to.eql(['name', 'price']);
    });

    it('responde 400 VALIDATION_ERROR si el stock no es entero', async () => {
      const res = await request(app).post('/api/products').send({ name: 'Caja', price: 10, stock: 1.5 });

      const error = expectErrorResponse(res, { status: 400, code: 'VALIDATION_ERROR' });
      expect(error.details.errors.map((e) => e.field)).to.eql(['stock']);
    });

    it('responde 400 NEGATIVE_VALUE si el precio es negativo', async () => {
      const res = await request(app).post('/api/products').send({ name: 'Caja', price: -5 });

      expectErrorResponse(res, { status: 400, code: 'NEGATIVE_VALUE', details: { field: 'price', value: -5 } });
      expect(await ProductModel.countDocuments({})).to.equal(0);
    });

    it('responde 400 NEGATIVE_VALUE si el stock es negativo', async () => {
      const res = await request(app).post('/api/products').send({ name: 'Caja', price: 5, stock: -1 });

      expectErrorResponse(res, { status: 400, code: 'NEGATIVE_VALUE', details: { field: 'stock', value: -1 } });
    });
  });

  describe('PUT /api/products/:id', () => {
    it('actualiza el producto y recalcula el estado según el stock', async () => {
      const product = await createProduct({ stock: 10 });

      const res = await request(app).put(`/api/products/${product._id}`).send({ price: 1800, stock: 0 });

      expect(res.status).to.equal(200);
      expectProduct(res.body);
      expect(res.body.price).to.equal(1800);
      expect(res.body.stock).to.equal(0);
      expect(res.body.status).to.equal(PRODUCT_STATUS.OUT_OF_STOCK);
    });

    it('responde 400 VALIDATION_ERROR si no se envía ningún campo', async () => {
      const product = await createProduct();

      const res = await request(app).put(`/api/products/${product._id}`).send({});

      expectErrorResponse(res, { status: 400, code: 'VALIDATION_ERROR' });
    });

    it('responde 400 NEGATIVE_VALUE si el stock es negativo', async () => {
      const product = await createProduct();

      const res = await request(app).put(`/api/products/${product._id}`).send({ stock: -1 });

      expectErrorResponse(res, { status: 400, code: 'NEGATIVE_VALUE' });
    });

    it('responde 404 PRODUCT_NOT_FOUND si no existe', async () => {
      const res = await request(app).put(`/api/products/${NON_EXISTENT_ID}`).send({ price: 1 });

      expectErrorResponse(res, { status: 404, code: 'PRODUCT_NOT_FOUND', method: 'PUT' });
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('elimina el producto', async () => {
      const product = await createProduct();

      const res = await request(app).delete(`/api/products/${product._id}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.eql({ message: 'Producto eliminado.' });
      expect(await ProductModel.countDocuments({})).to.equal(0);
    });

    it('responde 404 PRODUCT_NOT_FOUND si no existe', async () => {
      const res = await request(app).delete(`/api/products/${NON_EXISTENT_ID}`);

      expectErrorResponse(res, { status: 404, code: 'PRODUCT_NOT_FOUND', method: 'DELETE' });
    });
  });
});
