import logger, { flushLogger } from './logger/index.js';

// Registra una falla crítica, vacía los logs a disco y termina el proceso.
let exiting = false;

async function exitWithFatal(message, error) {
  if (exiting) return;
  exiting = true;
  logger.fatal(message, { stack: error?.stack });
  await flushLogger();
  process.exit(1);
}

process.on('unhandledRejection', (reason) => {
  exitWithFatal('Promesa rechazada sin manejar', reason instanceof Error ? reason : new Error(String(reason)));
});
process.on('uncaughtException', (error) => {
  exitWithFatal('Excepción no capturada', error);
});

async function start() {
  // 1. Configuración de entorno (si falta una variable crítica, no arranca)
  let config;
  try {
    config = (await import('./config/index.js')).default;
  } catch (error) {
    await exitWithFatal(`Configuración de entorno inválida: ${error.message}`, error);
  }
  logger.info(`Entorno: ${config.nodeEnv} (nivel de log: ${config.logLevel})`);

  // 2. Base de datos
  try {
    const { connectDB } = await import('./config/db.js');
    await connectDB();
  } catch (error) {
    await exitWithFatal(error.message, error.cause ?? error);
  }

  // 3. Servidor HTTP
  const { default: app } = await import('./app.js');
  app.listen(config.port, () => {
    logger.info(`Servidor ShipNow escuchando en el puerto ${config.port}`);
  });
}

start();
