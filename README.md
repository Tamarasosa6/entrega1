# ShipNow API

API REST de ShipNow refactorizada con **arquitectura por capas** (Controller → Service → Repository) y **configuración de entorno validada** al arranque.

## Requisitos

- Node.js 18 o superior
- MongoDB (local o Atlas)

## Cómo correr el proyecto localmente

1. Clonar el repositorio e instalar dependencias:

   ```bash
   git clone <https://github.com/Tamarasosa6/entrega1>
   cd shipnow-api
   npm install
   ```

2. Crear el archivo de entorno a partir del ejemplo:

   ```bash
   cp .env.example .env      # en Windows (PowerShell): copy .env.example .env
   ```

3. Completar los valores en `.env`:

   ```env
   PORT=3000
   MONGODB_URI=mongodb://127.0.0.1:27017/shipnow
   NODE_ENV=development
   ```

4. Iniciar el servidor:

   ```bash
   npm run dev     # con recarga automática
   npm start       # modo normal
   ```

Si falta alguna variable (por ejemplo `MONGODB_URI`), la app lanza un error descriptivo y **no arranca**.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/products` | Lista productos disponibles (con stock) |
| GET | `/api/products/:id` | Detalle de un producto |
| POST | `/api/products` | Crea un producto |
| PUT | `/api/products/:id` | Actualiza un producto |
| DELETE | `/api/products/:id` | Elimina un producto |
| GET | `/api/users` | Lista usuarios (sin contraseñas) |
| GET | `/api/users/:id` | Detalle de un usuario |
| POST | `/api/users` | Crea un usuario |
| PUT | `/api/users/:id` | Actualiza un usuario |
| DELETE | `/api/users/:id` | Elimina un usuario |

Ejemplos de body:

```json
// POST /api/products
{ "name": "Caja chica", "description": "20x20", "price": 1500, "stock": 10 }

// POST /api/users
{ "name": "Ana", "email": "ana@mail.com", "password": "secreto123", "role": "USER" }
```

## Estructura

```
src/
├── config/          # env.config.js (validación de .env), db.js (conexión)
├── constants/       # USER_ROLES, PRODUCT_STATUS, HTTP_STATUS (Object.freeze)
├── controllers/     # Capa HTTP: req/res y status codes
├── services/        # Lógica de negocio
├── repositories/    # Único lugar que conoce Mongoose
├── models/          # Solo esquemas
├── routes/          # Solo conectan path → método del Controller
├── middlewares/     # Manejo centralizado de errores
└── utils/           # AppError, alias de constantes
```

Flujo de dependencias: `Route → Controller → Service → Repository → Model`.
El Controller nunca importa Mongoose, y `process.env` solo se lee en `src/config/env.config.js`.

## Por qué separé la lógica entre Service y Repository

- **Repository**: encapsula *cómo* se accede a los datos. Sabe de Mongoose, proyecciones (por ejemplo, nunca devuelve el hash de `password`), orden por defecto, `.lean()` y validación de `ObjectId`. Si mañana cambiara la base de datos, solo se tocaría esta capa.
- **Service**: contiene las *reglas de negocio*: el listado público de productos solo muestra los que tienen stock, el estado (`AVAILABLE` / `OUT_OF_STOCK`) se deriva del stock y no se setea a mano, el email de usuario debe ser único, se valida el rol contra `USER_ROLES` y la contraseña se hashea con bcrypt antes de guardarse.
- **Controller**: traduce HTTP ↔ Service (lee `req`, devuelve el status code apropiado) y delega los errores al middleware.

Así cada capa tiene una sola responsabilidad y se puede probar o cambiar sin afectar a las demás.

## Constantes

Los roles y estados se usan siempre vía objetos congelados, sin strings sueltos:

```js
import { USER_ROLES, PRODUCT_STATUS } from './src/constants/index.js';
USER_ROLES.ADMIN;            // 'ADMIN'
PRODUCT_STATUS.OUT_OF_STOCK; // 'OUT_OF_STOCK'
```
