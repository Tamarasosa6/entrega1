# ShipNow API

API REST de ShipNow con **arquitectura por capas** (Controller → Service → Repository), **configuración de entorno validada** al arranque, un **módulo de mocking** para generar y cargar datos de prueba y un **manejo de errores centralizado**.

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
| GET | `/api/orders` | Lista pedidos (útil para ver los datos cargados con mocks) |
| GET | `/api/orders/:id` | Detalle de un pedido |
| GET | `/api/mocks/...` | Datos simulados, **no se guardan** (ver módulo de mocking) |
| POST | `/api/mocks/seed` | Inserta datos de prueba en MongoDB (ver módulo de mocking) |

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
├── controllers/     # Capa HTTP: req/res; los errores se derivan con next(error)
├── services/        # Lógica de negocio: validan y lanzan errores del dominio
├── repositories/    # Único lugar que conoce Mongoose
├── models/          # Solo esquemas: user, product, order, delivery
├── errors/          # Diccionario de errores, AppError, errores del dominio y normalizador
├── middlewares/     # error.middleware.js: único lugar que responde errores
├── routes/          # Solo conectan path → método del Controller
└── utils/           # mockData (listas y helpers), validators, alias de constantes
```

Flujo de dependencias: `Route → Controller → Service → Repository → Model`.
El Controller nunca importa Mongoose, y `process.env` solo se lee en `src/config/env.config.js`.

## Por qué separé la lógica entre Service y Repository

- **Repository**: encapsula *cómo* se accede a los datos. Sabe de Mongoose, proyecciones (por ejemplo, nunca devuelve el hash de `password`), orden por defecto, `.lean()` y validación de `ObjectId`. Si mañana cambiara la base de datos, solo se tocaría esta capa.
- **Service**: contiene las *reglas de negocio* y detecta los errores: valida los datos, comprueba que el recurso exista y lanza el error del dominio que corresponde.
- **Controller**: traduce HTTP ↔ Service (lee `req`, devuelve el status code de éxito) y deriva cualquier error al middleware con `next(error)`.

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

# Manejo de errores

Todo el manejo de errores pasa por una capa común (`src/errors/` + `src/middlewares/error.middleware.js`):

1. **Los services detectan el problema** y lanzan un error personalizado del dominio (por ejemplo `UserNotFoundError`, `InvalidQuantityError`).
2. **El controller no responde errores**: solo hace `next(error)`.
3. **El middleware global es el único que responde.** Convierte cualquier error en una respuesta HTTP con la misma estructura.

Piezas:

| Archivo | Rol |
|---------|-----|
| `errors/error.dictionary.js` | Diccionario: para cada código de error, su status HTTP y su mensaje |
| `errors/AppError.js` | Error base: se crea con un código del diccionario (status y mensaje salen de ahí) |
| `errors/domain.errors.js` | Errores del dominio: `UserNotFoundError`, `ProductNotFoundError`, `OrderNotFoundError`, `EmailAlreadyExistsError`, `InvalidRoleError`, `InvalidStatusError`, `InvalidQuantityError`, `NegativeValueError`, `MockSeedError`, etc. |
| `errors/error.normalizer.js` | Traduce errores externos (JSON mal formado, validación o `_id` inválido de Mongoose, clave duplicada, base de datos caída) a errores de la app. Cualquier error inesperado se convierte en `INTERNAL_ERROR` sin exponer detalles |
| `middlewares/error.middleware.js` | `errorHandler` (respuesta uniforme) y `notFoundHandler` (rutas inexistentes) |

## Estructura de la respuesta de error

Todos los errores responden con el mismo formato (`details` es `null` cuando no hay información extra):

```json
{
  "success": false,
  "error": {
    "code": "INVALID_QUANTITY",
    "message": "La cantidad \"0\" no es válida: debe ser un número entero entre 1 y 100.",
    "status": 400,
    "details": { "received": "0", "min": 1, "max": 100, "reason": "OUT_OF_RANGE" },
    "path": "/api/mocks/users?qty=0",
    "method": "GET",
    "timestamp": "2026-10-17T22:10:24.173Z"
  }
}
```

Los errores de servidor (5xx) se registran en la consola con su causa original, pero esa información nunca se envía al cliente.

## Catálogo de errores

| Código | Status | Cuándo ocurre |
|--------|--------|---------------|
| `VALIDATION_ERROR` | 400 | Faltan campos o tienen tipo incorrecto (`details.errors` lista cada campo) |
| `INVALID_JSON` | 400 | El body no es un JSON válido |
| `INVALID_ID` | 400 | El id no tiene formato de ObjectId |
| `NEGATIVE_VALUE` | 400 | Valor negativo (precio, stock o `qty` de mocks) |
| `INVALID_ROLE` / `INVALID_STATUS` / `INVALID_PRIORITY` | 400 | Valor fuera de `USER_ROLES` / `ORDER_STATUS` / `ORDER_PRIORITY` |
| `INVALID_QUANTITY` | 400 | `qty` no numérico, no entero o fuera de 1–100 (`details.reason`: `NOT_A_NUMBER`, `NOT_AN_INTEGER`, `OUT_OF_RANGE`) |
| `INVALID_MOCK_ENTITY` | 400 | `entity` no permitida en `/api/mocks/seed` |
| `SEED_DISABLED` | 403 | Carga de mocks con `NODE_ENV=production` |
| `USER_NOT_FOUND` / `PRODUCT_NOT_FOUND` / `ORDER_NOT_FOUND` | 404 | No existe el recurso |
| `ROUTE_NOT_FOUND` | 404 | La ruta no existe |
| `EMAIL_ALREADY_EXISTS` | 409 | Ya hay un usuario con ese email |
| `DUPLICATE_KEY` | 409 | Se viola un índice único en la base |
| `MOCK_DEPENDENCY_MISSING` | 409 | Faltan datos previos para cargar mocks (clientes, repartidores o pedidos) |
| `MOCK_SEED_FAILED` | 500 | Falló la inserción en MongoDB durante la carga de mocks |
| `DATABASE_UNAVAILABLE` | 503 | La base de datos no responde |
| `INTERNAL_ERROR` | 500 | Error inesperado |

## Cómo probar los casos inválidos

Con el servidor corriendo (`npm run dev`). Los GET se pueden pegar en el navegador; los demás, con `curl` en una segunda terminal (en cmd de Windows las comillas son necesarias; en PowerShell usar `curl.exe`).

**Módulo de mocks**

| Prueba | Resultado esperado |
|--------|--------------------|
| `GET /api/mocks/users?qty=0` | 400 `INVALID_QUANTITY` (`OUT_OF_RANGE`) |
| `GET /api/mocks/users?qty=1000` | 400 `INVALID_QUANTITY` (`OUT_OF_RANGE`) |
| `GET /api/mocks/users?qty=abc` | 400 `INVALID_QUANTITY` (`NOT_A_NUMBER`) |
| `GET /api/mocks/users?qty=2.5` | 400 `INVALID_QUANTITY` (`NOT_AN_INTEGER`) |
| `GET /api/mocks/users?qty=-5` | 400 `NEGATIVE_VALUE` |
| `GET /api/mocks/users?qty=3&role=cliente` | 400 `INVALID_ROLE` |
| `GET /api/mocks/orders?qty=3&status=FOO` | 400 `INVALID_STATUS` |
| `GET /api/mocks/orders?qty=3&priority=FOO` | 400 `INVALID_PRIORITY` |

```bash
curl -X POST "http://localhost:3000/api/mocks/seed?qty=-3"
# 400 NEGATIVE_VALUE

curl -X POST "http://localhost:3000/api/mocks/seed?qty=5&entity=foo"
# 400 INVALID_MOCK_ENTITY

curl -X POST "http://localhost:3000/api/mocks/seed?qty=5&entity=orders"
# 409 MOCK_DEPENDENCY_MISSING (si todavía no hay clientes cargados en la base)
```

- **Carga en producción**: iniciar con `NODE_ENV=production` y hacer `POST /api/mocks/seed?qty=5` → 403 `SEED_DISABLED`.
- **Falla de MongoDB durante la carga**: con el servicio de MongoDB detenido (o una URI sin acceso), `POST /api/mocks/seed?qty=5` → 500 `MOCK_SEED_FAILED` con `details.entity` y `details.reason`. Puede tardar unos segundos hasta que Mongoose agota el tiempo de espera.

**Usuarios, productos y pedidos**

```bash
# Ruta inexistente → 404 ROUTE_NOT_FOUND
curl "http://localhost:3000/api/nada"

# Id con formato inválido → 400 INVALID_ID
curl "http://localhost:3000/api/users/abc"

# Id válido pero inexistente → 404 USER_NOT_FOUND (idem PRODUCT_NOT_FOUND / ORDER_NOT_FOUND)
curl "http://localhost:3000/api/users/64b000000000000000000000"
curl "http://localhost:3000/api/orders/64b000000000000000000000"

# Body sin campos obligatorios → 400 VALIDATION_ERROR (details.errors lista name y price)
curl -X POST http://localhost:3000/api/products -H "Content-Type: application/json" -d "{}"

# Precio negativo → 400 NEGATIVE_VALUE
curl -X POST http://localhost:3000/api/products -H "Content-Type: application/json" -d "{\"name\":\"Caja\",\"price\":-5}"

# JSON mal formado → 400 INVALID_JSON
curl -X POST http://localhost:3000/api/products -H "Content-Type: application/json" -d "{malo"

# Rol inválido → 400 INVALID_ROLE
curl -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d "{\"name\":\"Ana\",\"email\":\"ana@mail.com\",\"password\":\"secreto123\",\"role\":\"cliente\"}"

# Mismo email dos veces → la segunda da 409 EMAIL_ALREADY_EXISTS
curl -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d "{\"name\":\"Ana\",\"email\":\"ana@mail.com\",\"password\":\"secreto123\"}"
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
- `qty` se limita entre 1 y 100 (por defecto 10). Los valores inválidos responden con el error correspondiente (ver *Manejo de errores*).

## Endpoints que devuelven datos simulados (no guardan nada)

Se pueden probar directamente desde el navegador:

| Método | Ruta | Devuelve |
|--------|------|----------|
| GET | `/api/mocks/users?qty=2` | Usuarios con roles mezclados. Opcional: `&role=USER`, `&role=DRIVER` o `&role=ADMIN` |
| GET | `/api/mocks/drivers?qty=3` | Repartidores (`role: DRIVER`) |
| GET | `/api/mocks/orders?qty=5` | Pedidos con estados y prioridades válidos. Opcional: `&status=PENDING`, `&priority=URGENT` |
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

Notas:

- Todos los usuarios de prueba tienen la contraseña `Test1234` (se guarda hasheada con bcrypt).
- La carga está **deshabilitada con `NODE_ENV=production`** (responde 403).
- Si falla la inserción en MongoDB, responde 500 `MOCK_SEED_FAILED`; puede haber quedado una carga parcial.
- Para limpiar los datos de prueba, borrar las colecciones desde MongoDB Compass o `mongosh`.

### Flujo recomendado para probar

1. `GET /api/mocks/dataset?qty=5` para ver la forma de los datos sin tocar la base.
2. `POST /api/mocks/seed?qty=20&entity=all` para cargar un conjunto completo.
3. `GET /api/orders` para ver los pedidos cargados, y comprobar en MongoDB las colecciones `users`, `orders` y `deliveries`.
