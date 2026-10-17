import { InvalidIdError } from '../errors/domain.errors.js';

const ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== '';

// Formato de id de MongoDB (24 caracteres hexadecimales), sin depender de Mongoose.
export function assertValidId(id) {
  if (typeof id !== 'string' || !ID_REGEX.test(id)) {
    throw new InvalidIdError(id);
  }
}
