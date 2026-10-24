import { OrderService } from '../services/order.service.js';
import { HTTP_STATUS } from '../constants/index.js';

// Solo maneja req/res: delega todo al Service.
export const OrderController = {
  async getAll(req, res, next) {
    try {
      const orders = await OrderService.getAll();
      res.status(HTTP_STATUS.OK).json(orders);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const order = await OrderService.getById(req.params.id);
      res.status(HTTP_STATUS.OK).json(order);
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const order = await OrderService.updateStatus(req.params.id, req.body);
      res.status(HTTP_STATUS.OK).json(order);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const order = await OrderService.create(req.body);
      res.status(HTTP_STATUS.CREATED).json(order);
    } catch (error) {
      next(error);
    }
  },
};
