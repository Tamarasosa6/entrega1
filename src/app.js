import express from 'express';
import productRoutes from './routes/product.routes.js';
import userRoutes from './routes/user.routes.js';
import orderRoutes from './routes/order.routes.js';
import deliveryRoutes from './routes/delivery.routes.js';
import mockRoutes from './routes/mock.routes.js';
import loggerRoutes from './routes/logger.routes.js';
import docsRouter from './docs/docs.router.js';
import { requestLogger } from './middlewares/requestLogger.middleware.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

const app = express();

app.use(requestLogger);
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/docs', docsRouter);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/mocks', mockRoutes);
app.use('/api/logger', loggerRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
