import { MockService } from '../services/mock.service.js';
import { HTTP_STATUS } from '../constants/index.js';

// Solo maneja req/res: delega todo al Service. Los errores se derivan al
// middleware global con next(error); acá nunca se arma una respuesta de error.
export const MockController = {
  getUsers(req, res, next) {
    try {
      const users = MockService.getUsers(req.query.qty, req.query.role);
      res.status(HTTP_STATUS.OK).json(users);
    } catch (error) {
      next(error);
    }
  },

  getDrivers(req, res, next) {
    try {
      const drivers = MockService.getDrivers(req.query.qty);
      res.status(HTTP_STATUS.OK).json(drivers);
    } catch (error) {
      next(error);
    }
  },

  getOrders(req, res, next) {
    try {
      const { qty, status, priority } = req.query;
      const orders = MockService.getOrders(qty, status, priority);
      res.status(HTTP_STATUS.OK).json(orders);
    } catch (error) {
      next(error);
    }
  },

  getDeliveries(req, res, next) {
    try {
      const deliveries = MockService.getDeliveries(req.query.qty);
      res.status(HTTP_STATUS.OK).json(deliveries);
    } catch (error) {
      next(error);
    }
  },

  getDataset(req, res, next) {
    try {
      const dataset = MockService.getDataset(req.query.qty);
      res.status(HTTP_STATUS.OK).json(dataset);
    } catch (error) {
      next(error);
    }
  },

  async seed(req, res, next) {
    try {
      const result = await MockService.seed(req.query.qty, req.query.entity);
      res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
      next(error);
    }
  },
};
