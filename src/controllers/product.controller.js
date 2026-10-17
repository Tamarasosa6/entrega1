import { ProductService } from '../services/product.service.js';
import { HTTP_STATUS } from '../constants/index.js';

// Solo maneja req/res: delega todo al Service.
export const ProductController = {
  async getAll(req, res, next) {
    try {
      const products = await ProductService.getAll();
      res.status(HTTP_STATUS.OK).json(products);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const product = await ProductService.getById(req.params.id);
      res.status(HTTP_STATUS.OK).json(product);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const product = await ProductService.create(req.body);
      res.status(HTTP_STATUS.CREATED).json(product);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const product = await ProductService.update(req.params.id, req.body);
      res.status(HTTP_STATUS.OK).json(product);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await ProductService.delete(req.params.id);
      res.status(HTTP_STATUS.OK).json({ message: 'Producto eliminado.' });
    } catch (error) {
      next(error);
    }
  },
};
