import { UserRepository } from '../repositories/user.repository.js';
import { OrderRepository } from '../repositories/order.repository.js';
import { DeliveryRepository } from '../repositories/delivery.repository.js';
import { FileStorage } from '../storage/file.storage.js';
import {
  DOCUMENT_TYPES,
  RECEIPT_DOCUMENT_TYPE,
  UPLOAD_FIELDS,
  UPLOAD_FOLDERS,
} from '../constants/index.js';
import {
  FileRequiredError,
  InvalidDocumentTypeError,
  UserNotFoundError,
  OrderNotFoundError,
  DeliveryNotFoundError,
} from '../errors/domain.errors.js';
import { assertValidId } from '../utils/validators.js';
import logger from '../logger/index.js';

// Tipo de documento: es opcional (por defecto OTHER), pero si se envía tiene que ser válido.
function resolveDocumentType(value) {
  if (value === undefined || value === '') return DOCUMENT_TYPES.OTHER;
  const allowed = Object.values(DOCUMENT_TYPES);
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw new InvalidDocumentTypeError(value, allowed);
  }
  return value;
}

// Flujo común de una carga: valida, confirma que la entidad existe, guarda el archivo en disco
// y registra los metadatos. Si el registro falla, borra el archivo para no dejarlo huérfano.
async function storeAndRegister({ id, file, fieldName, folder, documentType, findEntity, register, notFound }) {
  assertValidId(id);
  if (!file) throw new FileRequiredError(fieldName);

  const entity = await findEntity(id);
  if (!entity) throw notFound(id);

  let metadata;
  try {
    metadata = await FileStorage.save({ folder, fieldName, file });
  } catch (error) {
    logger.error('Error al guardar el archivo subido', { entityId: id, folder, reason: error.cause?.message });
    throw error;
  }
  metadata.documentType = documentType;

  try {
    const updated = await register(id, metadata);
    if (!updated) throw notFound(id); // la entidad se eliminó mientras se guardaba el archivo
    return { metadata, updated };
  } catch (error) {
    await FileStorage.remove(metadata.path);
    throw error;
  }
}

export const UploadService = {
  // POST /api/users/:id/documents
  async uploadUserDocument(id, file, body = {}) {
    // Se valida antes de tocar el disco ni la base
    assertValidId(id);
    if (!file) throw new FileRequiredError(UPLOAD_FIELDS.USER_DOCUMENT);
    const documentType = resolveDocumentType(body?.documentType);

    const { metadata, updated } = await storeAndRegister({
      id,
      file,
      fieldName: UPLOAD_FIELDS.USER_DOCUMENT,
      folder:
        documentType === DOCUMENT_TYPES.DRIVER_LICENSE
          ? UPLOAD_FOLDERS.DRIVER_LICENSES
          : UPLOAD_FOLDERS.USER_DOCUMENTS,
      documentType,
      findEntity: UserRepository.getById,
      register: UserRepository.addDocument,
      notFound: (userId) => new UserNotFoundError(userId),
    });

    logger.info('Documento de usuario cargado', {
      userId: id,
      documentType,
      storedName: metadata.storedName,
      size: metadata.size,
    });
    return { document: metadata, user: updated };
  },

  // POST /api/orders/:id/receipts
  async uploadOrderReceipt(id, file) {
    const { metadata, updated } = await storeAndRegister({
      id,
      file,
      fieldName: UPLOAD_FIELDS.RECEIPT,
      folder: UPLOAD_FOLDERS.RECEIPTS,
      documentType: RECEIPT_DOCUMENT_TYPE,
      findEntity: OrderRepository.getById,
      register: OrderRepository.addReceipt,
      notFound: (orderId) => new OrderNotFoundError(orderId),
    });

    logger.info('Comprobante asociado a un pedido', {
      orderId: id,
      storedName: metadata.storedName,
      size: metadata.size,
    });
    return { receipt: metadata, order: updated };
  },

  // POST /api/deliveries/:id/receipts
  async uploadDeliveryReceipt(id, file) {
    const { metadata, updated } = await storeAndRegister({
      id,
      file,
      fieldName: UPLOAD_FIELDS.RECEIPT,
      folder: UPLOAD_FOLDERS.RECEIPTS,
      documentType: RECEIPT_DOCUMENT_TYPE,
      findEntity: DeliveryRepository.getById,
      register: DeliveryRepository.addReceipt,
      notFound: (deliveryId) => new DeliveryNotFoundError(deliveryId),
    });

    logger.info('Comprobante asociado a una entrega', {
      deliveryId: id,
      storedName: metadata.storedName,
      size: metadata.size,
    });
    return { receipt: metadata, delivery: updated };
  },
};
