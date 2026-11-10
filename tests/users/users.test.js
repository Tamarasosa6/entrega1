import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app.js';
import { USER_ROLES } from '../../src/constants/index.js';
import { UserModel } from '../../src/models/user.model.js';
import { UserNotFoundError, EmailAlreadyExistsError } from '../../src/errors/domain.errors.js';
import { clearDatabase } from '../helpers/db.js';
import { createUser } from '../helpers/factories.js';
import { expectErrorResponse, expectUser } from '../helpers/assertions.js';
import { NON_EXISTENT_ID, MALFORMED_ID } from '../helpers/constants.js';

describe('Users', () => {
  beforeEach(clearDatabase);

  describe('GET /api/users', () => {
    it('devuelve la lista de usuarios con la estructura correcta y sin contraseñas', async () => {
      const client = await createUser({ role: USER_ROLES.USER });
      const driver = await createUser({ role: USER_ROLES.DRIVER });

      const res = await request(app).get('/api/users');

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
      expect(res.body).to.have.lengthOf(2);
      res.body.forEach(expectUser);
      expect(res.body.map((user) => user._id).sort()).to.eql([client._id, driver._id].sort());
      expect(res.body.find((user) => user._id === driver._id).role).to.equal(USER_ROLES.DRIVER);
    });

    it('devuelve una lista vacía cuando no hay usuarios', async () => {
      const res = await request(app).get('/api/users');

      expect(res.status).to.equal(200);
      expect(res.body).to.eql([]);
    });
  });

  describe('GET /api/users/:id', () => {
    it('devuelve el usuario pedido', async () => {
      const user = await createUser();

      const res = await request(app).get(`/api/users/${user._id}`);

      expect(res.status).to.equal(200);
      expectUser(res.body);
      expect(res.body._id).to.equal(user._id);
      expect(res.body.email).to.equal(user.email);
    });

    it('responde 404 USER_NOT_FOUND si el usuario no existe', async () => {
      const path = `/api/users/${NON_EXISTENT_ID}`;
      const res = await request(app).get(path);

      const error = expectErrorResponse(res, {
        status: 404,
        code: 'USER_NOT_FOUND',
        method: 'GET',
        path,
        message: new UserNotFoundError(NON_EXISTENT_ID).message,
      });
      expect(error.message).to.include(NON_EXISTENT_ID);
    });

    it('responde 400 INVALID_ID si el id tiene formato inválido', async () => {
      const path = `/api/users/${MALFORMED_ID}`;
      const res = await request(app).get(path);

      expectErrorResponse(res, { status: 400, code: 'INVALID_ID', method: 'GET', path, details: { id: MALFORMED_ID } });
    });
  });

  describe('POST /api/users', () => {
    const validBody = { name: 'Ana Pérez', email: 'ana.test@mail.com', password: 'secreto123' };

    it('crea un usuario con rol USER por defecto y no devuelve la contraseña', async () => {
      const res = await request(app).post('/api/users').send(validBody);

      expect(res.status).to.equal(201);
      expectUser(res.body);
      expect(res.body.name).to.equal(validBody.name);
      expect(res.body.email).to.equal(validBody.email);
      expect(res.body.role).to.equal(USER_ROLES.USER);

      // Quedó guardado, y la contraseña se almacenó hasheada
      const stored = await UserModel.findById(res.body._id).lean();
      expect(stored).to.not.equal(null);
      expect(stored.password).to.not.equal(validBody.password);
      expect(stored.password).to.match(/^\$2[aby]\$/);
    });

    it('crea un usuario con el rol indicado', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ ...validBody, role: USER_ROLES.DRIVER });

      expect(res.status).to.equal(201);
      expect(res.body.role).to.equal(USER_ROLES.DRIVER);
    });

    it('guarda el email en minúsculas', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ ...validBody, email: 'ANA.Test@Mail.com' });

      expect(res.status).to.equal(201);
      expect(res.body.email).to.equal('ana.test@mail.com');
    });

    it('responde 400 VALIDATION_ERROR con el detalle de cada campo si faltan datos', async () => {
      const res = await request(app).post('/api/users').send({});

      const error = expectErrorResponse(res, { status: 400, code: 'VALIDATION_ERROR', method: 'POST', path: '/api/users' });
      expect(error.details.errors.map((e) => e.field)).to.eql(['name', 'email', 'password']);
      error.details.errors.forEach((e) => expect(e.message).to.be.a('string'));
    });

    it('responde 400 VALIDATION_ERROR si el email o la contraseña no son válidos', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ name: 'Ana', email: 'no-es-un-email', password: '123' });

      const error = expectErrorResponse(res, { status: 400, code: 'VALIDATION_ERROR' });
      expect(error.details.errors.map((e) => e.field)).to.eql(['email', 'password']);
    });

    it('responde 400 INVALID_ROLE si el rol no es uno de los permitidos', async () => {
      const res = await request(app).post('/api/users').send({ ...validBody, role: 'cliente' });

      expectErrorResponse(res, {
        status: 400,
        code: 'INVALID_ROLE',
        details: { received: 'cliente', allowed: Object.values(USER_ROLES) },
      });
    });

    it('responde 409 EMAIL_ALREADY_EXISTS si el email ya está registrado (sin importar mayúsculas)', async () => {
      await createUser({ email: 'repetido@mail.com' });

      const res = await request(app)
        .post('/api/users')
        .send({ ...validBody, email: 'Repetido@Mail.com' });

      expectErrorResponse(res, {
        status: 409,
        code: 'EMAIL_ALREADY_EXISTS',
        message: new EmailAlreadyExistsError('Repetido@Mail.com').message,
        details: { email: 'Repetido@Mail.com' },
      });
      expect(await UserModel.countDocuments({})).to.equal(1);
    });

    it('responde 400 INVALID_JSON si el body no es un JSON válido', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send('{"name": "Ana", ');

      expectErrorResponse(res, { status: 400, code: 'INVALID_JSON', method: 'POST', path: '/api/users' });
    });
  });

  describe('PUT /api/users/:id', () => {
    it('actualiza el nombre y el rol', async () => {
      const user = await createUser({ role: USER_ROLES.USER });

      const res = await request(app)
        .put(`/api/users/${user._id}`)
        .send({ name: 'Nombre Nuevo', role: USER_ROLES.DRIVER });

      expect(res.status).to.equal(200);
      expectUser(res.body);
      expect(res.body._id).to.equal(user._id);
      expect(res.body.name).to.equal('Nombre Nuevo');
      expect(res.body.role).to.equal(USER_ROLES.DRIVER);
      expect(res.body.email).to.equal(user.email); // el email no cambia
    });

    it('responde 400 VALIDATION_ERROR si no se envía ningún campo', async () => {
      const user = await createUser();

      const res = await request(app).put(`/api/users/${user._id}`).send({});

      const error = expectErrorResponse(res, { status: 400, code: 'VALIDATION_ERROR' });
      expect(error.details.errors[0].field).to.equal('body');
    });

    it('responde 400 INVALID_ROLE si el rol no es válido', async () => {
      const user = await createUser();

      const res = await request(app).put(`/api/users/${user._id}`).send({ role: 'jefe' });

      expectErrorResponse(res, { status: 400, code: 'INVALID_ROLE' });
    });

    it('responde 404 USER_NOT_FOUND si el usuario no existe', async () => {
      const res = await request(app).put(`/api/users/${NON_EXISTENT_ID}`).send({ name: 'Nadie' });

      expectErrorResponse(res, { status: 404, code: 'USER_NOT_FOUND', method: 'PUT' });
    });

    it('responde 400 INVALID_ID si el id tiene formato inválido', async () => {
      const res = await request(app).put(`/api/users/${MALFORMED_ID}`).send({ name: 'Nadie' });

      expectErrorResponse(res, { status: 400, code: 'INVALID_ID' });
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('elimina el usuario', async () => {
      const user = await createUser();

      const res = await request(app).delete(`/api/users/${user._id}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.eql({ message: 'Usuario eliminado.' });
      expect(await UserModel.findById(user._id)).to.equal(null);
    });

    it('responde 404 USER_NOT_FOUND si el usuario no existe', async () => {
      const res = await request(app).delete(`/api/users/${NON_EXISTENT_ID}`);

      expectErrorResponse(res, { status: 404, code: 'USER_NOT_FOUND', method: 'DELETE' });
    });

    it('responde 400 INVALID_ID si el id tiene formato inválido', async () => {
      const res = await request(app).delete(`/api/users/${MALFORMED_ID}`);

      expectErrorResponse(res, { status: 400, code: 'INVALID_ID', method: 'DELETE' });
    });
  });
});
