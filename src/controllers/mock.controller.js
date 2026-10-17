import { MockService } from '../services/mock.service.js';
import { HTTP_STATUS } from '../constants/index.js';

// Solo maneja req/res: delega todo al Service.
export const MockController = {
  getUsers(req, res, next) {
    try {
      res.status(HTTP_STATUS.OK).json(MockService.getUsers(req.query.qty, req.query.role));
    } catch (error) {
      next(error);
    }
  },

  getDrivers(req, res, next) {
    try {
      res.status(HTTP_STATUS.OK).json(MockService.getDrivers(req.query.qty));
    } catch (error) {
      next(error);
    }
  },

  getOrders(req, res, next) {
    try {
      res.status(HTTP_STATUS.OK).json(MockService.getOrders(req.query.qty));
    } catch (error) {
      next(error);
    }
  },

  getDeliveries(req, res, next) {
    try {
      res.status(HTTP_STATUS.OK).json(MockService.getDeliveries(req.query.qty));
    } catch (error) {
      next(error);
    }
  },

  getDataset(req, res, next) {
    try {
      res.status(HTTP_STATUS.OK).json(MockService.getDataset(req.query.qty));
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
