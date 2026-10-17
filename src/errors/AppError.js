import { ERROR_CODES, ERROR_DICTIONARY } from './error.dictionary.js';

// Error base de la aplicación. Se crea con un código del diccionario: el
// status HTTP y el mensaje salen de ahí, no se escriben a mano.
export class AppError extends Error {
  constructor(code = ERROR_CODES.INTERNAL_ERROR, details = null, { cause } = {}) {
    const entry = ERROR_DICTIONARY[code];
    const finalCode = entry ? code : ERROR_CODES.INTERNAL_ERROR;
    const finalEntry = entry ?? ERROR_DICTIONARY[ERROR_CODES.INTERNAL_ERROR];
    const message =
      typeof finalEntry.message === 'function'
        ? finalEntry.message(details ?? {})
        : finalEntry.message;

    super(message, { cause });
    this.name = new.target.name;
    this.code = finalCode;
    this.statusCode = finalEntry.status;
    this.details = details;
  }
}
