import { readFileSync } from 'node:fs';
import config from '../config/index.js';
import { schemas, parameters } from './schemas.js';
import { productsPaths, usersPaths } from './paths/catalog.paths.js';
import { ordersPaths, deliveriesPaths } from './paths/orders.paths.js';
import { mocksPaths, loggerPaths, healthPaths } from './paths/mocks.paths.js';

const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

// Especificación OpenAPI 3.0 de ShipNow API.
// Está separada de las rutas: acá solo se describe la API, no se ejecuta lógica.
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ShipNow API',
    version,
    description: [
      'API REST de **ShipNow**, un sistema de gestión de pedidos y entregas.',
      '',
      '**Propósito:** administrar usuarios (clientes y repartidores), productos, pedidos y entregas, y ofrecer herramientas de prueba (datos simulados y verificación del logger) para desarrollo y revisión técnica.',
      '',
      '**Arquitectura:** Controller → Service → Repository (Node.js, Express y MongoDB/Mongoose).',
      '',
      '**Autenticación:** esta versión no tiene autenticación; todos los endpoints son públicos.',
      '',
      '**Errores:** todos los errores tienen la misma estructura (`success: false` + `error` con `code`, `message`, `status`, `details`, `path`, `method` y `timestamp`) y se describen con el schema `ErrorResponse`. Cualquier ruta inexistente responde 404 `ROUTE_NOT_FOUND`.',
      '',
      '**Éxito:** los endpoints devuelven directamente el recurso (o una lista); al eliminar se devuelve `{ "message": "..." }`.',
    ].join('\n'),
  },
  servers: [{ url: `http://localhost:${config.port}`, description: 'Servidor local' }],
  tags: [
    { name: 'Users', description: 'Usuarios: clientes (USER), repartidores (DRIVER) y administradores (ADMIN).' },
    { name: 'Products', description: 'Catálogo de productos y su stock.' },
    { name: 'Orders', description: 'Pedidos de los clientes: alta, consulta y cambio de estado.' },
    { name: 'Deliveries', description: 'Entregas asociadas a pedidos y, cuando corresponde, a repartidores.' },
    { name: 'Mocks', description: 'Generación de datos simulados (sin guardar) y carga de datos de prueba en MongoDB.' },
    { name: 'Logger', description: 'Herramienta interna para validar el sistema de logs. No es funcionalidad de negocio.' },
    { name: 'Health', description: 'Verificación de que el servidor está activo.' },
  ],
  paths: {
    ...usersPaths,
    ...productsPaths,
    ...ordersPaths,
    ...deliveriesPaths,
    ...mocksPaths,
    ...loggerPaths,
    ...healthPaths,
  },
  components: { schemas, parameters },
};
