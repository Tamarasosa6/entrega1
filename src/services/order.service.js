import { OrderRepository } from '../repositories/order.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { ORDER_STATUS, ORDER_PRIORITY, USER_ROLES } from '../constants/index.js';
import {
  OrderNotFoundError,
  UserNotFoundError,
  InvalidPriorityError,
  NegativeValueError,
  RequestValidationError,
} from '../errors/domain.errors.js';
import { assertValidId, isNonEmptyString } from '../utils/validators.js';
import logger from '../logger/index.js';

// Valida los ítems y devuelve la lista de errores de campo (vacía si está bien).
function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return [{ field: 'items', message: 'Debe haber al menos un ítem.' }];
  }

  const errors = [];
  items.forEach((item, index) => {
    const prefix = `items[${index}]`;
    if (!isNonEmptyString(item?.name)) {
      errors.push({ field: `${prefix}.name`, message: 'El nombre es obligatorio y debe ser texto.' });
    }
    if (!Number.isInteger(item?.quantity)) {
      errors.push({ field: `${prefix}.quantity`, message: 'La cantidad debe ser un número entero.' });
    }
    if (typeof item?.unitPrice !== 'number' || Number.isNaN(item.unitPrice)) {
      errors.push({ field: `${prefix}.unitPrice`, message: 'El precio unitario debe ser un número.' });
    }
  });
  return errors;
}

function assertNoNegativeItemValues(items) {
  items.forEach((item, index) => {
    if (item.quantity < 0) throw new NegativeValueError(`items[${index}].quantity`, item.quantity);
    if (item.unitPrice < 0) throw new NegativeValueError(`items[${index}].unitPrice`, item.unitPrice);
    if (item.quantity === 0) {
      throw new RequestValidationError([
        { field: `items[${index}].quantity`, message: 'La cantidad debe ser al menos 1.' },
      ]);
    }
  });
}

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

  // El total y el estado inicial los define el servicio, no el cliente.
  async create(data = {}) {
    const { customer, items, shippingAddress, priority = ORDER_PRIORITY.NORMAL } = data;

    const errors = [];
    if (typeof customer !== 'string') {
      errors.push({ field: 'customer', message: 'El id del cliente es obligatorio.' });
    }
    errors.push(...validateItems(items));
    if (!isNonEmptyString(shippingAddress)) {
      errors.push({ field: 'shippingAddress', message: 'La dirección de envío es obligatoria.' });
    }
    if (errors.length > 0) throw new RequestValidationError(errors);

    assertValidId(customer);
    assertNoNegativeItemValues(items);
    if (!Object.values(ORDER_PRIORITY).includes(priority)) {
      throw new InvalidPriorityError(priority, Object.values(ORDER_PRIORITY));
    }

    const user = await UserRepository.getById(customer);
    if (!user) throw new UserNotFoundError(customer);
    if (user.role !== USER_ROLES.USER) {
      throw new RequestValidationError([
        { field: 'customer', message: `El usuario debe tener rol ${USER_ROLES.USER} para hacer pedidos.` },
      ]);
    }

    const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const order = await OrderRepository.create({
      customer,
      items: items.map(({ name, quantity, unitPrice }) => ({ name, quantity, unitPrice })),
      total,
      status: ORDER_STATUS.PENDING,
      priority,
      shippingAddress,
    });

    logger.info(`Pedido creado: ${order._id}`, {
      orderId: String(order._id),
      customer,
      total,
      priority,
      status: order.status,
    });
    return order;
  },
};
