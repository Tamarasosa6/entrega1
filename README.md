# ShipNow API

API REST de ShipNow con **arquitectura por capas** (Controller → Service → Repository), **configuración de entorno validada** al arranque y un **módulo de mocking** para generar y cargar datos de prueba.

## Requisitos

- Node.js 18 o superior
- MongoDB (local o Atlas)

## Cómo correr el proyecto localmente

1. Clonar el repositorio e instalar dependencias:

   ```bash
   git clone https://github.com/Tamarasosa6/entrega1.git
   cd entrega1
   npm install
   ```

2. Crear el archivo de entorno a partir del ejemplo:

   ```bash
   cp .env.example .env      # en Windows (cmd): copy .env.example .env
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
| GET | `/api/mocks/...` | Datos simulados, **no se guardan** (ver más abajo) |
| POST | `/api/mocks/seed` | Inserta datos de prueba en MongoDB (ver más abajo) |

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
├── constants/       # roles, estados, prioridades, límites de mocks (Object.freeze)
├── controllers/     # Capa HTTP: req/res y status codes
├── services/        # Lógica de negocio (incluye la generación de mocks)
├── repositories/    # Único lugar que conoce Mongoose
├── models/          # Solo esquemas: user, product, order, delivery
├── routes/          # Solo conectan path → método del Controller
├── middlewares/     # Manejo centralizado de errores
└── utils/           # AppError, mockData (listas y helpers aleatorios), alias de constantes
```

Flujo de dependencias: `Route → Controller → Service → Repository → Model`.
El Controller nunca importa Mongoose, y `process.env` solo se lee en `src/config/env.config.js`.

## Por qué separé la lógica entre Service y Repository

- **Repository**: encapsula *cómo* se accede a los datos. Sabe de Mongoose, proyecciones (por ejemplo, nunca devuelve el hash de `password`), orden por defecto, `.lean()` y validación de `ObjectId`. Si mañana cambiara la base de datos, solo se tocaría esta capa.
- **Service**: contiene las *reglas de negocio*: el listado público de productos solo muestra los que tienen stock, el estado (`AVAILABLE` / `OUT_OF_STOCK`) se deriva del stock y no se setea a mano, el email de usuario debe ser único, se valida el rol contra `USER_ROLES` y la contraseña se hashea con bcrypt antes de guardarse.
- **Controller**: traduce HTTP ↔ Service (lee `req`, devuelve el status code apropiado) y delega los errores al middleware.

Así cada capa tiene una sola responsabilidad y se puede probar o cambiar sin afectar a las demás.

## Constantes

Roles, estados y prioridades se usan siempre vía objetos congelados, sin strings sueltos:

```js
import { USER_ROLES, ORDER_STATUS, ORDER_PRIORITY, DELIVERY_STATUS } from './src/constants/index.js';

USER_ROLES        // ADMIN, USER (cliente), DRIVER (repartidor)
ORDER_STATUS      // PENDING, IN_PROGRESS, DELIVERED, CANCELLED
ORDER_PRIORITY    // LOW, NORMAL, HIGH, URGENT
DELIVERY_STATUS   // PENDING, ASSIGNED, IN_TRANSIT, DELIVERED
PRODUCT_STATUS    // AVAILABLE, OUT_OF_STOCK
```

---

# Módulo de mocking (`/api/mocks`)

Genera datos simulados con la misma forma que los modelos reales, sin depender de datos cargados a mano. La lógica vive en `services/mock.service.js`; `routes/mock.routes.js` solo conecta paths con el `MockController`, y los repositorios (`user`, `order`, `delivery`) son los únicos que insertan en MongoDB.

## Qué datos se pueden generar

| Entidad | Cómo se representa | Campos principales |
|---------|--------------------|--------------------|
| **Usuarios** | `User` con rol de `USER_ROLES` | `_id`, `name`, `email` (`@test.com`), `role` |
| **Repartidores** | `User` con `role: DRIVER` | igual que usuarios |
| **Pedidos** | `Order` | `_id`, `customer` (id de un usuario `USER`), `items`, `total`, `status`, `priority`, `shippingAddress` |
| **Entregas** | `Delivery` | `_id`, `order`, `driver`, `status`, `address`, `scheduledDate`, `deliveredAt` |

Reglas que respetan los datos generados:

- `status` y `priority` de los pedidos salen siempre de `ORDER_STATUS` y `ORDER_PRIORITY`; el `total` es la suma de `quantity × unitPrice` de sus ítems.
- Cada pedido apunta a un cliente (`role: USER`) del mismo conjunto de datos.
- Hay una entrega por pedido, salvo los pedidos `CANCELLED`, que no tienen entrega.
- El estado de la entrega es coherente con el del pedido: `PENDING` → entrega `PENDING` (sin repartidor, `driver: null`); `IN_PROGRESS` → `ASSIGNED` o `IN_TRANSIT`; `DELIVERED` → `DELIVERED` (con `deliveredAt`).
- Las entregas que ya no están `PENDING` tienen un repartidor (`role: DRIVER`) asignado.
- `qty` se limita entre 1 y 100 (por defecto 10).

## Endpoints que devuelven datos simulados (no guardan nada)

Se pueden probar directamente desde el navegador:

| Método | Ruta | Devuelve |
|--------|------|----------|
| GET | `/api/mocks/users?qty=2` | Usuarios con roles mezclados. Opcional: `&role=USER`, `&role=DRIVER` o `&role=ADMIN` |
| GET | `/api/mocks/drivers?qty=3` | Repartidores (`role: DRIVER`) |
| GET | `/api/mocks/orders?qty=5` | Pedidos con estados y prioridades válidos |
| GET | `/api/mocks/deliveries?qty=5` | Entregas asociadas a pedidos y repartidores del mismo conjunto |
| GET | `/api/mocks/dataset?qty=5` | Todo junto y consistente: `{ users, drivers, orders, deliveries }` (`qty` = cantidad de pedidos) |

Ejemplo: `GET http://localhost:3000/api/mocks/users?qty=2`

```json
[
  { "_id": "6d78e5300a759cd596bc3a15", "name": "Ana Pérez", "email": "ana.perez4821@test.com", "role": "USER" },
  { "_id": "3f1c0a9be2d44f7a8c10b6e2", "name": "Luis Gómez", "email": "luis.gomez7305@test.com", "role": "DRIVER" }
]
```

(Los campos están en inglés para coincidir con los modelos reales del proyecto.)

## Carga de datos de prueba en MongoDB

`POST /api/mocks/seed?qty=10&entity=<entidad>`

| `entity` | Qué inserta | Requisitos |
|----------|-------------|------------|
| `users` (por defecto) | `qty` usuarios con roles mezclados | — |
| `drivers` | `qty` repartidores | — |
| `orders` | `qty` pedidos asignados a clientes **ya existentes** en la base | Haber cargado `users` antes |
| `deliveries` | Entregas para pedidos existentes que aún no tienen una (no cancelados), hasta `qty` | Haber cargado `orders` (y `drivers` si hay pedidos en curso o entregados) |
| `all` | Un conjunto completo y consistente: usuarios + repartidores + pedidos + entregas (`qty` = cantidad de pedidos) | — |

Desde la terminal (en cmd de Windows las comillas son necesarias por el `&`):

```bash
curl -X POST "http://localhost:3000/api/mocks/seed?qty=10"
# → {"insertados":10,"coleccion":"users"}

curl -X POST "http://localhost:3000/api/mocks/seed?qty=5&entity=drivers"
# → {"insertados":5,"coleccion":"users"}

curl -X POST "http://localhost:3000/api/mocks/seed?qty=20&entity=all"
# → {"insertados":..., "colecciones":{"users":..,"orders":20,"deliveries":..}}
```

En PowerShell usar `curl.exe` en lugar de `curl`. También se puede probar con Postman o Thunder Client.

Notas:

- Todos los usuarios de prueba tienen la contraseña `Test1234` (se guarda hasheada con bcrypt).
- La carga está **deshabilitada con `NODE_ENV=production`** (responde 403).
- Un `qty` inválido (0, mayor a 100, no numérico) responde 400 con un mensaje descriptivo, igual que una `entity` o un `role` no permitidos.
- Para limpiar los datos de prueba, borrar las colecciones desde MongoDB Compass o `mongosh`.

### Flujo recomendado para probar

1. `GET /api/mocks/dataset?qty=5` para ver la forma de los datos sin tocar la base.
2. `POST /api/mocks/seed?qty=20&entity=all` para cargar un conjunto completo.
3. Comprobar en MongoDB las colecciones `users`, `orders` y `deliveries`.
