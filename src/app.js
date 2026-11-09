import express from 'express';
import userRoutes from './routes/user.routes.js';
import orderRoutes from './routes/order.routes.js';
import logger from './logger/index.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);

app.get('/api/logger/test', (req, res) => {
  logger.info('Mensaje de prueba: info (evento normal del sistema)', { source: 'logger-test' });
  logger.warning('Mensaje de prueba: warning (algo inesperado que no frena la app)', { source: 'logger-test' });
  logger.error('Mensaje de prueba: error (una operación falló)', { source: 'logger-test' });
  logger.fatal('Mensaje de prueba: fatal (falla crítica)', { source: 'logger-test' });
  res.status(200).json({ success: true, message: 'Logs de prueba emitidos correctamente' });
});

app.get('/api/docs', (req, res) => {
  res.status(200).json({ success: true, message: 'Swagger Docs Mock' });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  logger.error(`${err.code || 'INTERNAL_ERROR'}: ${err.message}`, {
    code: err.code || 'INTERNAL_ERROR',
    status,
    method: req.method,
    path: req.originalUrl,
    details: err.details || undefined
  });
  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message
    }
  });
});

export default app;
