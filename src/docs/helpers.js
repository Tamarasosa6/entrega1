import {
  InternalError,
  DatabaseUnavailableError,
} from '../errors/domain.errors.js';

// Utilidades para armar la especificación OpenAPI.

export const ID_EXAMPLE = '64b0f3a2c9d4e5a1b2c3d4e5';
const EXAMPLE_TIMESTAMP = '2026-10-24T18:15:30.000Z';

export const schemaRef = (name) => ({ $ref: `#/components/schemas/${name}` });
export const paramRef = (name) => ({ $ref: `#/components/parameters/${name}` });

export const jsonContent = (schema, example) => ({
  'application/json': { schema, ...(example !== undefined ? { example } : {}) },
});

export const okResponse = (description, schema, example) => ({
  description,
  content: jsonContent(schema, example),
});

const STATUS_DESCRIPTIONS = Object.freeze({
  400: 'Datos inválidos',
  403: 'Operación no permitida',
  404: 'Recurso no encontrado',
  409: 'Conflicto con el estado actual de los datos',
  500: 'Error interno del servidor',
  503: 'Base de datos no disponible',
});

// Misma estructura que arma el middleware global de errores.
function errorBody(error, method, path) {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      status: error.statusCode,
      details: error.details ?? null,
      path,
      method,
      timestamp: EXAMPLE_TIMESTAMP,
    },
  };
}

// Arma las respuestas de error de un endpoint a partir de instancias de los
// errores reales (así los códigos, status y mensajes coinciden con la API).
//
// errors: { 400: [error, ['clave', error], ...], 404: [...] }
// Cada ejemplo se identifica por su código (o por la clave si se indica).
// Con db: true se agregan además el 500 y el 503 de base de datos.
export function errorResponses({ method, path, errors = {}, db = true }) {
  const all = { ...errors, 500: [...(errors[500] ?? []), new InternalError()] };
  if (db) all[503] = [...(errors[503] ?? []), new DatabaseUnavailableError()];

  const responses = {};
  for (const status of Object.keys(all).sort()) {
    const examples = {};
    for (const entry of all[status]) {
      const [key, error] = Array.isArray(entry) ? entry : [entry.code, entry];
      if (error.statusCode !== Number(status)) {
        throw new Error(`Doc inconsistente: ${error.code} responde ${error.statusCode}, no ${status}`);
      }
      examples[key] = { summary: key, value: errorBody(error, method, path) };
    }
    responses[status] = {
      description: STATUS_DESCRIPTIONS[status],
      content: {
        'application/json': { schema: schemaRef('ErrorResponse'), examples },
      },
    };
  }
  return responses;
}
