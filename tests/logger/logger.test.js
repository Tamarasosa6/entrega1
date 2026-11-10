import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app.js';
import config from '../../src/config/index.js';
import logger from '../../src/logger/index.js';
import { LOG_LEVELS } from '../../src/constants/index.js';
import { expectErrorResponse } from '../helpers/assertions.js';

// Orden en que el endpoint emite los mensajes: del más detallado al más severo
const EXPECTED_LEVELS = ['debug', 'http', 'info', 'warning', 'error', 'fatal'];

describe('Logger - GET /api/logger/test', () => {
  it('responde 200 y emite un mensaje por cada nivel de log', async () => {
    const res = await request(app).get('/api/logger/test');

    expect(res.status).to.equal(200);
    expect(res.headers['content-type']).to.match(/application\/json/);
    expect(Object.keys(res.body).sort()).to.eql(['activeLevel', 'emitted', 'environment', 'message', 'note']);
    expect(res.body.emitted).to.eql(EXPECTED_LEVELS);
    expect(res.body.message).to.be.a('string');
    expect(res.body.note).to.be.a('string');
  });

  it('informa el entorno y el nivel activo del logger', async () => {
    const res = await request(app).get('/api/logger/test');

    expect(res.body.environment).to.equal('test');
    expect(res.body.activeLevel).to.equal(config.logLevel);
    expect(Object.values(LOG_LEVELS)).to.include(res.body.activeLevel);
  });

  it('el logger centralizado tiene un método por cada nivel definido', () => {
    expect(Object.values(LOG_LEVELS).sort()).to.eql([...EXPECTED_LEVELS].sort());
    EXPECTED_LEVELS.forEach((level) => expect(logger[level]).to.be.a('function'));
  });

  it('puede llamarse varias veces seguidas con el mismo resultado', async () => {
    const first = await request(app).get('/api/logger/test');
    const second = await request(app).get('/api/logger/test');

    expect(second.status).to.equal(200);
    expect(second.body.emitted).to.eql(first.body.emitted);
  });

  it('solo acepta GET: otros métodos responden 404 ROUTE_NOT_FOUND', async () => {
    const res = await request(app).post('/api/logger/test');

    expectErrorResponse(res, { status: 404, code: 'ROUTE_NOT_FOUND', method: 'POST', path: '/api/logger/test' });
  });
});
