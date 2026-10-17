import config from './config/index.js'; // valida el entorno: si falta algo, lanza error y no arranca
import { connectDB } from './config/db.js';
import app from './app.js';

async function start() {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`[Server] ShipNow API escuchando en http://localhost:${config.port} (${config.nodeEnv})`);
  });
}

start().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
