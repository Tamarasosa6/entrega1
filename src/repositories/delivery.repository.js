import mongoose from 'mongoose';
import { DeliveryModel } from '../models/delivery.model.js';

const DEFAULT_PROJECTION = '-__v';

export const DeliveryRepository = {
  async getAll({ limit = 500 } = {}) {
    return DeliveryModel.find({}, DEFAULT_PROJECTION)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  },

  async getById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return DeliveryModel.findById(id, DEFAULT_PROJECTION).lean();
  },

  async update(id, data) {
    if (!mongoose.isValidObjectId(id)) return null;
    return DeliveryModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
      projection: DEFAULT_PROJECTION,
    }).lean();
  },

  // IDs de los pedidos que ya tienen una entrega asociada
  async getOrderIdsWithDelivery() {
    const ids = await DeliveryModel.distinct('order');
    return ids.map(String);
  },

  async insertMany(deliveries) {
    const inserted = await DeliveryModel.insertMany(deliveries);
    return inserted.length;
  },
};
