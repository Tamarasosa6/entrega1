import { DeliveryModel } from '../models/delivery.model.js';

export const DeliveryRepository = {
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
