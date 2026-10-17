import dotenv from 'dotenv';

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

// Único lugar del proyecto donde se lee process.env
const config = Object.freeze({
  port,
  mongodbUri,
  nodeEnv,
  isProduction: nodeEnv === 'production',
});

export default config;
