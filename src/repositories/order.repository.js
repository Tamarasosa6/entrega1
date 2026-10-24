import mongoose from 'mongoose';
import { OrderModel } from '../models/order.model.js';

const DEFAULT_PROJECTION = '-__v';

export const OrderRepository = {
  async getAll({ limit = 500 } = {}) {
    return OrderModel.find({}, DEFAULT_PROJECTION)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  },

  async getById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return OrderModel.findById(id, DEFAULT_PROJECTION).lean();
  },

  async create(data) {
    const order = await OrderModel.create(data);
    return order.toObject({ versionKey: false });
  },

  async insertMany(orders) {
    const inserted = await OrderModel.insertMany(orders);
    return inserted.length;
  },
};
