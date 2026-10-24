import { AppError } from './AppError.js';
import { ERROR_CODES } from './error.dictionary.js';

// Errores del dominio. Cada uno representa un caso concreto; los services
// los lanzan y el middleware global los convierte en la respuesta HTTP.

// ----- Genéricos -----

// details: [{ field, message }, ...]
export class RequestValidationError extends AppError {
  constructor(errors = []) {
    super(ERROR_CODES.VALIDATION_ERROR, { errors });
  }
}

export class InvalidJsonError extends AppError {
  constructor() {
    super(ERROR_CODES.INVALID_JSON);
  }
}

export class InvalidIdError extends AppError {
  constructor(id) {
    super(ERROR_CODES.INVALID_ID, { id: String(id) });
  }
}

export class NegativeValueError extends AppError {
  constructor(field, value) {
    super(ERROR_CODES.NEGATIVE_VALUE, { field, value });
  }
}

export class RouteNotFoundError extends AppError {
  constructor(method, path) {
    super(ERROR_CODES.ROUTE_NOT_FOUND, { method, path });
  }
}

export class DuplicateKeyError extends AppError {
  constructor(fields = null) {
    super(ERROR_CODES.DUPLICATE_KEY, fields ? { fields } : null);
  }
}

export class DatabaseUnavailableError extends AppError {
  constructor(cause) {
    super(ERROR_CODES.DATABASE_UNAVAILABLE, null, { cause });
  }
}

export class InternalError extends AppError {
  constructor(cause) {
    super(ERROR_CODES.INTERNAL_ERROR, null, { cause });
  }
}

// ----- Usuarios, productos y pedidos -----

export class UserNotFoundError extends AppError {
  constructor(id) {
    super(ERROR_CODES.USER_NOT_FOUND, { id: String(id) });
  }
}

export class ProductNotFoundError extends AppError {
  constructor(id) {
    super(ERROR_CODES.PRODUCT_NOT_FOUND, { id: String(id) });
  }
}

export class OrderNotFoundError extends AppError {
  constructor(id) {
    super(ERROR_CODES.ORDER_NOT_FOUND, { id: String(id) });
  }
}

export class EmailAlreadyExistsError extends AppError {
  constructor(email) {
    super(ERROR_CODES.EMAIL_ALREADY_EXISTS, { email });
  }
}

export class InvalidRoleError extends AppError {
  constructor(received, allowed) {
    super(ERROR_CODES.INVALID_ROLE, { received: String(received), allowed });
  }
}

export class InvalidStatusError extends AppError {
  constructor(received, allowed) {
    super(ERROR_CODES.INVALID_STATUS, { received: String(received), allowed });
  }
}

export class InvalidPriorityError extends AppError {
  constructor(received, allowed) {
    super(ERROR_CODES.INVALID_PRIORITY, { received: String(received), allowed });
  }
}

// ----- Mocks -----

// details: { received, min, max, reason }
export class InvalidQuantityError extends AppError {
  constructor(details) {
    super(ERROR_CODES.INVALID_QUANTITY, details);
  }
}

export class InvalidMockEntityError extends AppError {
  constructor(received, allowed) {
    super(ERROR_CODES.INVALID_MOCK_ENTITY, { received: String(received), allowed });
  }
}

export class MockDependencyMissingError extends AppError {
  constructor(entity, missing, suggestion) {
    super(ERROR_CODES.MOCK_DEPENDENCY_MISSING, { entity, missing, suggestion });
  }
}

export class SeedDisabledError extends AppError {
  constructor() {
    super(ERROR_CODES.SEED_DISABLED);
  }
}

// ----- Logger -----

export class LoggerTestDisabledError extends AppError {
  constructor() {
    super(ERROR_CODES.LOGGER_TEST_DISABLED);
  }
}

// Falla durante la carga en MongoDB: se conserva el error original como `cause`.
export class MockSeedError extends AppError {
  constructor(entity, cause) {
    super(ERROR_CODES.MOCK_SEED_FAILED, { entity, reason: MockSeedError.describe(cause) }, { cause });
  }

  static describe(cause) {
    if (cause?.code === 11000) return 'DUPLICATE_KEY';
    return cause?.name ?? 'UNKNOWN';
  }
}
