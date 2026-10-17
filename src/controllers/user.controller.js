import { UserService } from '../services/user.service.js';
import { HTTP_STATUS } from '../constants/index.js';

// Solo maneja req/res: delega todo al Service.
export const UserController = {
  async getAll(req, res, next) {
    try {
      const users = await UserService.getAll();
      res.status(HTTP_STATUS.OK).json(users);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const user = await UserService.getById(req.params.id);
      res.status(HTTP_STATUS.OK).json(user);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const user = await UserService.create(req.body);
      res.status(HTTP_STATUS.CREATED).json(user);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const user = await UserService.update(req.params.id, req.body);
      res.status(HTTP_STATUS.OK).json(user);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await UserService.delete(req.params.id);
      res.status(HTTP_STATUS.OK).json({ message: 'Usuario eliminado.' });
    } catch (error) {
      next(error);
    }
  },
};
