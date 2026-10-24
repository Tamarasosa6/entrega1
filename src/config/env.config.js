import dotenv from 'dotenv';
import { LOG_LEVELS, DEFAULT_LOG_LEVEL_BY_ENV } from '../constants/index.js';

dotenv.config();

const REQUIRED_VARS = ['PORT', 'MONGODB_URI', 'NODE_ENV'];
const VALID_ENVIRONMENTS = ['development', 'production', 'test'];

const missing = REQUIRED_VARS.filter((name) => {
  const value = process.env[name];
  return value === undefined || value.trim() === '';
});

if (missing.length > 0) {
  throw new Error(
    `[Config] Faltan variables de entorno obligatorias: ${missing.join(', ')}.\n` +
      `Copiá .env.example a .env y completá los valores.`
  );
}

const port = Number(process.env.PORT);
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error(
    `[Config] PORT debe ser un número entero entre 1 y 65535 (valor recibido: "${process.env.PORT}").`
  );
}

const nodeEnv = process.env.NODE_ENV.trim();
if (!VALID_ENVIRONMENTS.includes(nodeEnv)) {
  throw new Error(
    `[Config] NODE_ENV inválido ("${nodeEnv}"). Valores permitidos: ${VALID_ENVIRONMENTS.join(', ')}.`
  );
}

const mongodbUri = process.env.MONGODB_URI.trim();
if (!/^mongodb(\+srv)?:\/\//.test(mongodbUri)) {
  throw new Error(
    '[Config] MONGODB_URI debe comenzar con "mongodb://" o "mongodb+srv://".'
  );
}

// LOG_LEVEL es opcional: si no está, se elige según el entorno.
const rawLogLevel = (process.env.LOG_LEVEL ?? '').trim().toLowerCase();
const validLogLevels = Object.values(LOG_LEVELS);
if (rawLogLevel !== '' && !validLogLevels.includes(rawLogLevel)) {
  throw new Error(
    `[Config] LOG_LEVEL inválido ("${rawLogLevel}"). Valores permitidos: ${validLogLevels.join(', ')}.`
  );
}
const logLevel = rawLogLevel || DEFAULT_LOG_LEVEL_BY_ENV[nodeEnv];

// Único lugar del proyecto donde se lee process.env
const config = Object.freeze({
  port,
  mongodbUri,
  nodeEnv,
  logLevel,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
});

export default config;
