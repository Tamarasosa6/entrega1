import { OrderModel } from '../models/order.model.js';

const DEFAULT_PROJECTION = '-__v';

export const OrderRepository = {
  async getAll({ limit = 500 } = {}) {
    return OrderModel.find({}, DEFAULT_PROJECTION)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  },

  async insertMany(orders) {
    const inserted = await OrderModel.insertMany(orders);
    return inserted.length;
  },
};
