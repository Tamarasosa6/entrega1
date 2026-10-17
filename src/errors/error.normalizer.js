import { AppError } from './AppError.js';
import {
  RequestValidationError,
  InvalidJsonError,
  InvalidIdError,
  DuplicateKeyError,
  DatabaseUnavailableError,
  InternalError,
} from './domain.errors.js';

const DB_UNAVAILABLE_ERROR_NAMES = new Set([
  'MongoServerSelectionError',
  'MongooseServerSelectionError',
  'MongoNetworkError',
  'MongoNetworkTimeoutError',
]);

// Convierte cualquier cosa que llegue al middleware en un AppError.
// Los errores de Mongoose / body-parser se reconocen por nombre, código o
// tipo, sin importar esas librerías.
export function toAppError(error) {
  if (error instanceof AppError) return error;

  // JSON mal formado en el body (express.json)
  if (error?.type === 'entity.parse.failed') return new InvalidJsonError();

  // Falla el esquema de Mongoose
  if (error?.name === 'ValidationError' && error.errors) {
    return new RequestValidationError(
      Object.values(error.errors).map((e) => ({ field: e.path, message: e.message }))
    );
  }

  // Valor que no se puede castear (por ejemplo un _id inválido)
  if (error?.name === 'CastError') {
    if (error.path === '_id') return new InvalidIdError(error.value);
    return new RequestValidationError([
      { field: error.path, message: `Valor inválido: ${error.value}` },
    ]);
  }

  // Índice único violado
  if (error?.code === 11000) return new DuplicateKeyError(error.keyValue ?? null);

  // Base de datos caída o inalcanzable
  if (DB_UNAVAILABLE_ERROR_NAMES.has(error?.name)) return new DatabaseUnavailableError(error);

  // Cualquier otro: error inesperado (no se filtra el detalle al cliente)
  return new InternalError(error);
}
