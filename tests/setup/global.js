// Archivo global de Mocha (se carga antes que cualquier test, ver .mocharc.json).
// El orden de los imports importa: primero el entorno de test, después la app.
import './env.js';
import '../../src/app.js'; // registra todos los modelos de Mongoose
import { connectTestDatabase, clearDatabase, disconnectTestDatabase } from '../helpers/db.js';

// Hooks globales: se conectan a la base de testing una sola vez y la dejan limpia al terminar.
before(async () => {
  await connectTestDatabase();
  await clearDatabase();
});

after(async () => {
  await clearDatabase();
  await disconnectTestDatabase();
});
