import { OrderRepository } from '../repositories/order.repository.js';
import { OrderNotFoundError } from '../errors/domain.errors.js';
import { assertValidId } from '../utils/validators.js';

export const OrderService = {
  async getAll() {
    return OrderRepository.getAll();
  },

  async getById(id) {
    assertValidId(id);
    const order = await OrderRepository.getById(id);
    if (!order) throw new OrderNotFoundError(id);
    return order;
  },
};
