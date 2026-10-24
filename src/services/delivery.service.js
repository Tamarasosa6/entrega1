import { DeliveryRepository } from '../repositories/delivery.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { DELIVERY_STATUS, USER_ROLES } from '../constants/index.js';
import {
  DeliveryNotFoundError,
  UserNotFoundError,
  InvalidStatusError,
  RequestValidationError,
} from '../errors/domain.errors.js';
import { assertValidId } from '../utils/validators.js';
import logger from '../logger/index.js';

const fieldError = (field, message) => new RequestValidationError([{ field, message }]);

export const DeliveryService = {
  async getAll() {
    return DeliveryRepository.getAll();
  },

  async getById(id) {
    assertValidId(id);
    const delivery = await DeliveryRepository.getById(id);
    if (!delivery) throw new DeliveryNotFoundError(id);
    return delivery;
  },

  // Reglas:
  // - PENDING: sin repartidor.
  // - ASSIGNED / IN_TRANSIT / DELIVERED: requieren un repartidor (rol DRIVER),
  //   enviado en el body o ya asignado a la entrega.
  // - DELIVERED registra la fecha de entrega.
  async updateStatus(id, data = {}) {
    assertValidId(id);

    const { status, driver } = data;
    if (status === undefined) throw fieldError('status', 'El estado es obligatorio.');
    if (!Object.values(DELIVERY_STATUS).includes(status)) {
      throw new InvalidStatusError(status, Object.values(DELIVERY_STATUS));
    }

    const delivery = await DeliveryRepository.getById(id);
    if (!delivery) throw new DeliveryNotFoundError(id);

    let driverId = delivery.driver ? String(delivery.driver) : null;

    if (driver !== undefined) {
      if (status === DELIVERY_STATUS.PENDING) {
        throw fieldError('driver', `Una entrega ${DELIVERY_STATUS.PENDING} no puede tener repartidor.`);
      }
      assertValidId(driver);
      const user = await UserRepository.getById(driver);
      if (!user) throw new UserNotFoundError(driver);
      if (user.role !== USER_ROLES.DRIVER) {
        throw fieldError('driver', `El usuario debe tener rol ${USER_ROLES.DRIVER}.`);
      }
      driverId = driver;
    }

    if (status === DELIVERY_STATUS.PENDING) {
      driverId = null;
    } else if (!driverId) {
      throw fieldError('driver', `Se requiere un repartidor para el estado ${status}.`);
    }

    const alreadyDelivered =
      delivery.status === DELIVERY_STATUS.DELIVERED && status === DELIVERY_STATUS.DELIVERED;
    const deliveredAt =
      status === DELIVERY_STATUS.DELIVERED ? (alreadyDelivered ? delivery.deliveredAt : new Date()) : null;

    const updated = await DeliveryRepository.update(id, { status, driver: driverId, deliveredAt });
    if (!updated) throw new DeliveryNotFoundError(id);

    logger.info(`Estado de la entrega actualizado: ${id}`, {
      deliveryId: String(id),
      status,
      driver: driverId,
    });
    return updated;
  },
};
