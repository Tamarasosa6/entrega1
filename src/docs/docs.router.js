import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './openapi.js';

// Router de la documentación interactiva (Swagger UI).
//   /api/docs        → interfaz Swagger UI
//   /api/docs/json   → especificación OpenAPI en JSON
const router = Router();

router.get('/json', (req, res) => res.json(openApiSpec));

router.use('/', swaggerUi.serve);
router.get(
  '/',
  swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'ShipNow API - Documentación',
    swaggerOptions: { docExpansion: 'list', displayRequestDuration: true },
  })
);

export default router;
