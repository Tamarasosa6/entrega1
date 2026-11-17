import { DeliveryService } from '../services/delivery.service.js';
import { UploadService } from '../services/upload.service.js';
import { HTTP_STATUS } from '../constants/index.js';

// Solo maneja req/res: delega todo al Service.
export const DeliveryController = {
  async getAll(req, res, next) {
    try {
      const deliveries = await DeliveryService.getAll();
      res.status(HTTP_STATUS.OK).json(deliveries);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const delivery = await DeliveryService.getById(req.params.id);
      res.status(HTTP_STATUS.OK).json(delivery);
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const delivery = await DeliveryService.updateStatus(req.params.id, req.body);
      res.status(HTTP_STATUS.OK).json(delivery);
    } catch (error) {
      next(error);
    }
  },

  async uploadReceipt(req, res, next) {
    try {
      const { receipt, delivery } = await UploadService.uploadDeliveryReceipt(req.params.id, req.file);
      res.status(HTTP_STATUS.CREATED).json({ message: 'Comprobante cargado correctamente.', receipt, delivery });
    } catch (error) {
      next(error);
    }
  },
};
