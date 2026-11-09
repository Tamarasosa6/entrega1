import { UserNotFoundError, OrderNotFoundError, InvalidDocTypeError } from '../errors/domain.errors.js';
import { DOCUMENT_TYPES } from '../constants/documentTypes.js';
import logger from '../logger/index.js';

export class UploadController {
  static async uploadUserDocument(req, res, next) {
    try {
      const { id } = req.params;
      const { docType } = req.body;
      const file = req.file;

      const allowedDocTypes = [DOCUMENT_TYPES.DNI, DOCUMENT_TYPES.DRIVER_LICENSE, DOCUMENT_TYPES.TAX_ID, DOCUMENT_TYPES.PROOF_OF_ADDRESS];
      if (docType && !allowedDocTypes.includes(docType)) {
        throw new InvalidDocTypeError(docType, allowedDocTypes);
      }

      const fileMetadata = {
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size,
        docType: docType || DOCUMENT_TYPES.DNI,
        uploadedAt: new Date()
      };

      logger.info(`Documento subido exitosamente para el usuario ${id}: ${file.filename}`);

      res.status(200).json({
        success: true,
        message: 'Documento subido y asociado correctamente al usuario',
        payload: {
          userId: id,
          document: fileMetadata
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async uploadOrderReceipt(req, res, next) {
    try {
      const { id } = req.params;
      const file = req.file;

      const fileMetadata = {
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size,
        docType: DOCUMENT_TYPES.RECEIPT,
        uploadedAt: new Date()
      };

      logger.info(`Comprobante asociado exitosamente al pedido/entrega ${id}: ${file.filename}`);

      res.status(200).json({
        success: true,
        message: 'Comprobante subido y asociado correctamente a la operación',
        payload: {
          entityId: id,
          receipt: fileMetadata
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
