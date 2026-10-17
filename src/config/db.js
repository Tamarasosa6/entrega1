import mongoose from 'mongoose';
import config from './index.js';

export async function connectDB() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('[DB] Conectado a MongoDB');
  } catch (error) {
    throw new Error(`[DB] No se pudo conectar a MongoDB: ${error.message}`);
  }
}
