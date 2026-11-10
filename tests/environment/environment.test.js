// Comportamiento según el entorno y la configuración. La configuración se evalúa una sola vez
// por proceso, así que estos casos se prueban en procesos hijos con su propio entorno.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { expect } from 'chai';

const PROJECT_URL = pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..') + path.sep).href;

// Ejecuta código ESM en un proceso nuevo con exactamente las variables de entorno indicadas.
// Se usa un directorio vacío como cwd para que dotenv no encuentre ningún archivo .env.
function runInChildProcess(script, env) {
  const cwd = mkdtempSync(path.join(tmpdir(), 'shipnow-env-'));
  try {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd,
      encoding: 'utf8',
      timeout: 30000,
      env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, ...env },
    });
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

const importConfigScript = `
  try {
    const { default: config } = await import(${JSON.stringify(new URL('src/config/index.js', PROJECT_URL).href)});
    console.log('CONFIG ' + JSON.stringify(config));
  } catch (error) {
    console.log('CONFIG_ERROR ' + error.message);
  }
  process.exit(0);
`;

const validEnv = {
  PORT: '3999',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/shipnow_test',
  NODE_ENV: 'development',
};

const configResult = (env) => {
  const { stdout } = runInChildProcess(importConfigScript, env);
  const line = stdout.split('\n').find((text) => text.startsWith('CONFIG'));
  return line;
};

describe('Entorno y configuración', () => {
  describe('validación de variables al arranque', () => {
    it('con las variables completas, exporta la configuración validada', () => {
      const line = configResult(validEnv);

      expect(line.startsWith('CONFIG ')).to.equal(true);
      const config = JSON.parse(line.replace('CONFIG ', ''));
      expect(config.port).to.equal(3999);
      expect(config.mongodbUri).to.equal(validEnv.MONGODB_URI);
      expect(config.nodeEnv).to.equal('development');
      expect(config.logLevel).to.equal('debug');
    });

    it('si falta MONGODB_URI, lanza un error descriptivo y no arranca', () => {
      const line = configResult({ PORT: '3999', NODE_ENV: 'development' });

      expect(line).to.include('CONFIG_ERROR');
      expect(line).to.include('Faltan variables de entorno obligatorias: MONGODB_URI');
    });

    it('informa todas las variables que faltan', () => {
      const line = configResult({});

      expect(line).to.include('PORT, MONGODB_URI, NODE_ENV');
    });

    it('rechaza un NODE_ENV inválido', () => {
      const line = configResult({ ...validEnv, NODE_ENV: 'staging' });

      expect(line).to.include('CONFIG_ERROR');
      expect(line).to.include('NODE_ENV inválido');
    });

    it('rechaza un LOG_LEVEL inválido', () => {
      const line = configResult({ ...validEnv, LOG_LEVEL: 'verbose' });

      expect(line).to.include('CONFIG_ERROR');
      expect(line).to.include('LOG_LEVEL inválido');
    });

    it('en producción el nivel de log por defecto es info', () => {
      const config = JSON.parse(configResult({ ...validEnv, NODE_ENV: 'production' }).replace('CONFIG ', ''));

      expect(config.logLevel).to.equal('info');
      expect(config.isProduction).to.equal(true);
    });
  });

  describe('funciones deshabilitadas en producción (403)', () => {
    const script = `
      const out = {};
      const { MockService } = await import(${JSON.stringify(new URL('src/services/mock.service.js', PROJECT_URL).href)});
      const { LoggerService } = await import(${JSON.stringify(new URL('src/services/logger.service.js', PROJECT_URL).href)});
      try { await MockService.seed('5'); out.seed = 'sin error'; }
      catch (error) { out.seed = { code: error.code, status: error.statusCode }; }
      try { LoggerService.emitTestLogs(); out.logger = 'sin error'; }
      catch (error) { out.logger = { code: error.code, status: error.statusCode }; }
      console.log('RESULT ' + JSON.stringify(out));
      process.exit(0);
    `;

    const run = (nodeEnv) => {
      const { stdout, stderr } = runInChildProcess(script, { ...validEnv, NODE_ENV: nodeEnv, LOG_LEVEL: 'fatal' });
      const line = stdout.split('\n').find((text) => text.startsWith('RESULT '));
      expect(line, `salida del proceso hijo: ${stdout} ${stderr}`).to.not.equal(undefined);
      return JSON.parse(line.replace('RESULT ', ''));
    };

    it('NODE_ENV=production: POST /api/mocks/seed responde 403 SEED_DISABLED', () => {
      expect(run('production').seed).to.eql({ code: 'SEED_DISABLED', status: 403 });
    });

    it('NODE_ENV=production: GET /api/logger/test responde 403 LOGGER_TEST_DISABLED', () => {
      expect(run('production').logger).to.eql({ code: 'LOGGER_TEST_DISABLED', status: 403 });
    });
  });
});
