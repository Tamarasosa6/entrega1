import mongoose from 'mongoose';
import config from './index.js';
import logger from '../logger/index.js';

let wasConnected = false;

// Eventos de la conexión una vez establecida (cortes, reconexiones)
mongoose.connection.on('disconnected', () => {
  // Si nunca llegó a conectarse, el fallo lo informa connectDB como fatal.
  if (wasConnected) logger.warning('Conexión a MongoDB perdida');
});
mongoose.connection.on('reconnected', () => {
  logger.info('Conexión a MongoDB restablecida');
});
mongoose.connection.on('error', (error) => {
  if (wasConnected) {
    logger.error(`Error en la conexión a MongoDB: ${error.message}`, { stack: error.stack });
  }
});

export async function connectDB() {
  try {
    await mongoose.connect(config.mongodbUri);
    wasConnected = true;
    logger.info('Conexión a MongoDB establecida');
  } catch (error) {
    // El arranque lo registra como fatal y termina el proceso.
    throw new Error(`No se pudo conectar a MongoDB: ${error.message}`, { cause: error });
  }
}
