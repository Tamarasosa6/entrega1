import mongoose from 'mongoose';
import config from '../../src/config/index.js';

// Última barrera: aunque algo falle en el setup, no se toca una base que no sea de testing.
function assertTestDatabase() {
  const name = mongoose.connection.name || /\/([^/?]+)(\?|$)/.exec(config.mongodbUri)?.[1] || '';
  if (config.nodeEnv !== 'test' || !/test/i.test(name)) {
    throw new Error(`[Tests] Se rechazó operar sobre la base "${name}": no es una base de testing.`);
  }
}

export async function connectTestDatabase() {
  assertTestDatabase();
  try {
    await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 5000 });
  } catch (error) {
    throw new Error(
      `[Tests] No se pudo conectar a la base de testing (${config.mongodbUri}).\n` +
        `¿Está MongoDB corriendo? Detalle: ${error.message}`
    );
  }
  // Asegura que los índices únicos (email, una entrega por pedido) existan antes de testear.
  await Promise.all(Object.values(mongoose.connection.models).map((model) => model.init()));
}

// Estrategia de limpieza: se vacían todas las colecciones (los índices se conservan).
// Cada grupo de tests la usa en su beforeEach, así ningún test depende del anterior.
export async function clearDatabase() {
  assertTestDatabase();
  await Promise.all(
    Object.values(mongoose.connection.models).map((model) => model.deleteMany({}))
  );
}

export async function disconnectTestDatabase() {
  await mongoose.disconnect();
}
