import {
  DOCUMENT_TYPES,
  RECEIPT_DOCUMENT_TYPE,
  UPLOAD_CONFIG,
  UPLOAD_FIELDS,
} from '../../constants/index.js';
import {
  InvalidIdError,
  FileRequiredError,
  InvalidFileTypeError,
  FileTooLargeError,
  UnexpectedFileFieldError,
  InvalidDocumentTypeError,
  InvalidUploadError,
  FileSaveError,
  UserNotFoundError,
  OrderNotFoundError,
  DeliveryNotFoundError,
} from '../../errors/domain.errors.js';
import { ID_EXAMPLE, schemaRef, paramRef, okResponse, errorResponses } from '../helpers.js';

const MAX_MB = UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024);
const ALLOWED_MIME = Object.keys(UPLOAD_CONFIG.ALLOWED_TYPES);

const exampleMetadata = (documentType, folder) => ({
  originalName: documentType === RECEIPT_DOCUMENT_TYPE ? 'comprobante.pdf' : 'dni-frente.pdf',
  storedName: 'document-1761328800000-3f1c0a9b-e2d4-4f7a-8c10-b6e2a1c9d4e5.pdf',
  path: `${folder}/document-1761328800000-3f1c0a9b-e2d4-4f7a-8c10-b6e2a1c9d4e5.pdf`,
  mimeType: 'application/pdf',
  size: 52341,
  documentType,
  uploadedAt: '2026-10-24T18:20:00.000Z',
});

const timestamps = { createdAt: '2026-10-24T18:00:00.000Z', updatedAt: '2026-10-24T18:20:00.000Z' };

// Errores comunes a todos los endpoints de carga, en el formato general del proyecto.
const uploadErrors = (method, path, notFound, extra400 = []) =>
  errorResponses({
    method,
    path,
    errors: {
      400: [
        new InvalidIdError('abc'),
        new FileRequiredError(path.endsWith('/documents') ? UPLOAD_FIELDS.USER_DOCUMENT : UPLOAD_FIELDS.RECEIPT),
        new InvalidFileTypeError('text/plain, .txt', ALLOWED_MIME),
        new UnexpectedFileFieldError('archivo', path.endsWith('/documents') ? UPLOAD_FIELDS.USER_DOCUMENT : UPLOAD_FIELDS.RECEIPT),
        new InvalidUploadError(),
        ...extra400,
      ],
      404: [notFound],
      413: [new FileTooLargeError(UPLOAD_CONFIG.MAX_FILE_SIZE)],
      500: [new FileSaveError(new Error('EACCES'))],
    },
  });

const multipart = (schemaName, encodingField) => ({
  required: true,
  content: {
    'multipart/form-data': {
      schema: schemaRef(schemaName),
      encoding: { [encodingField]: { contentType: ALLOWED_MIME.join(', ') } },
    },
  },
});

const receiptDescription = (entity) =>
  `Sube el comprobante de ${entity} en el campo \`${UPLOAD_FIELDS.RECEIPT}\` (multipart/form-data). ` +
  `Tipos permitidos: ${ALLOWED_MIME.join(', ')}. Tamaño máximo: ${MAX_MB} MB. ` +
  `El archivo se guarda en la carpeta \`receipts\` del servidor y en la base solo se registran sus metadatos. ` +
  `Responde 201 con el comprobante registrado y ${entity} actualizado.`;

export const uploadsPaths = {
  '/api/users/{id}/documents': {
    parameters: [paramRef('IdParam')],
    post: {
      tags: ['Users'],
      summary: 'Subir un documento de un usuario',
      description:
        `Sube un documento en el campo de archivo \`${UPLOAD_FIELDS.USER_DOCUMENT}\` (multipart/form-data) y lo asocia al usuario. ` +
        `Campo adicional opcional: \`documentType\` (${Object.values(DOCUMENT_TYPES).join(', ')}; por defecto ${DOCUMENT_TYPES.OTHER}). ` +
        `Tipos de archivo permitidos: ${ALLOWED_MIME.join(', ')}. Tamaño máximo: ${MAX_MB} MB. ` +
        'El archivo se guarda en la carpeta `documents` (las licencias, DRIVER_LICENSE, en `licenses`) y en la base solo se registran sus metadatos: nombre original, nombre generado, ruta, tipo, tamaño, tipo de documento y fecha de carga.',
      operationId: 'uploadUserDocument',
      requestBody: multipart('UserDocumentUploadForm', UPLOAD_FIELDS.USER_DOCUMENT),
      responses: {
        201: okResponse('Documento cargado. Devuelve los metadatos y el usuario actualizado.', schemaRef('UserDocumentUploadResult'), {
          message: 'Documento cargado correctamente.',
          document: exampleMetadata(DOCUMENT_TYPES.DNI, 'documents'),
          user: {
            _id: ID_EXAMPLE,
            name: 'Ana Pérez',
            email: 'ana@mail.com',
            role: 'USER',
            documents: [exampleMetadata(DOCUMENT_TYPES.DNI, 'documents')],
            ...timestamps,
          },
        }),
        ...uploadErrors('POST', `/api/users/${ID_EXAMPLE}/documents`, new UserNotFoundError(ID_EXAMPLE), [
          new InvalidDocumentTypeError('PASAPORTE', Object.values(DOCUMENT_TYPES)),
        ]),
      },
    },
  },
  '/api/orders/{id}/receipts': {
    parameters: [paramRef('IdParam')],
    post: {
      tags: ['Orders'],
      summary: 'Subir un comprobante de un pedido',
      description: receiptDescription('el pedido'),
      operationId: 'uploadOrderReceipt',
      requestBody: multipart('ReceiptUploadForm', UPLOAD_FIELDS.RECEIPT),
      responses: {
        201: okResponse('Comprobante cargado. Devuelve los metadatos y el pedido actualizado.', schemaRef('OrderReceiptUploadResult'), {
          message: 'Comprobante cargado correctamente.',
          receipt: exampleMetadata(RECEIPT_DOCUMENT_TYPE, 'receipts'),
          order: {
            _id: ID_EXAMPLE,
            customer: '64b0f3a2c9d4e5a1b2c3d4e6',
            items: [{ name: 'Caja chica', quantity: 2, unitPrice: 1500 }],
            total: 3000,
            status: 'PENDING',
            priority: 'NORMAL',
            shippingAddress: 'Mitre 123, Córdoba',
            receipts: [exampleMetadata(RECEIPT_DOCUMENT_TYPE, 'receipts')],
            ...timestamps,
          },
        }),
        ...uploadErrors('POST', `/api/orders/${ID_EXAMPLE}/receipts`, new OrderNotFoundError(ID_EXAMPLE)),
      },
    },
  },
  '/api/deliveries/{id}/receipts': {
    parameters: [paramRef('IdParam')],
    post: {
      tags: ['Deliveries'],
      summary: 'Subir un comprobante de una entrega',
      description: receiptDescription('la entrega'),
      operationId: 'uploadDeliveryReceipt',
      requestBody: multipart('ReceiptUploadForm', UPLOAD_FIELDS.RECEIPT),
      responses: {
        201: okResponse('Comprobante cargado. Devuelve los metadatos y la entrega actualizada.', schemaRef('DeliveryReceiptUploadResult'), {
          message: 'Comprobante cargado correctamente.',
          receipt: exampleMetadata(RECEIPT_DOCUMENT_TYPE, 'receipts'),
          delivery: {
            _id: ID_EXAMPLE,
            order: '64b0f3a2c9d4e5a1b2c3d4e6',
            driver: null,
            status: 'PENDING',
            address: 'Mitre 123, Córdoba',
            scheduledDate: '2026-10-25T15:00:00.000Z',
            deliveredAt: null,
            receipts: [exampleMetadata(RECEIPT_DOCUMENT_TYPE, 'receipts')],
            ...timestamps,
          },
        }),
        ...uploadErrors('POST', `/api/deliveries/${ID_EXAMPLE}/receipts`, new DeliveryNotFoundError(ID_EXAMPLE)),
      },
    },
  },
};
