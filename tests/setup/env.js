// Define el entorno de TESTING antes de que se cargue cualquier módulo de src/.
// Se importa primero desde tests/setup/global.js (los imports ESM se evalúan en orden).
import dotenv from 'dotenv';

process.env.NODE_ENV = 'test';

// 1) Variables propias de testing (opcional): .env.test, copiado de .env.test.example
dotenv.config({ path: '.env.test' });

// 2) Valores por defecto si no existe .env.test (no pisan lo que ya esté definido)
process.env.PORT ||= '3001';
process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/shipnow_test';

// 3) Protección: nunca correr los tests (que borran datos) contra una base que no sea de testing
const match = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/.exec(process.env.MONGODB_URI);
const databaseName = match?.[1] ?? '';

if (!/test/i.test(databaseName)) {
  throw new Error(
    `[Tests] La base de datos "${databaseName || '(sin nombre)'}" no parece de testing.\n` +
      'Los tests borran los datos de la base que usan. Usá una base descartable cuyo nombre ' +
      'contenga "test" (por ejemplo mongodb://127.0.0.1:27017/shipnow_test).'
  );
}
