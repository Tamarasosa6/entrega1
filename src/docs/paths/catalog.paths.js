import { USER_ROLES, PRODUCT_STATUS } from '../../constants/index.js';
import {
  InvalidIdError,
  InvalidJsonError,
  InvalidRoleError,
  NegativeValueError,
  ProductNotFoundError,
  UserNotFoundError,
  EmailAlreadyExistsError,
  RequestValidationError,
} from '../../errors/domain.errors.js';
import {
  ID_EXAMPLE,
  schemaRef,
  paramRef,
  jsonContent,
  okResponse,
  errorResponses,
} from '../helpers.js';

const invalidId = new InvalidIdError('abc');
const invalidJson = new InvalidJsonError();

const exampleProduct = {
  _id: ID_EXAMPLE,
  name: 'Caja chica',
  description: '20x20',
  price: 1500,
  stock: 10,
  status: PRODUCT_STATUS.AVAILABLE,
  createdAt: '2026-10-24T18:00:00.000Z',
  updatedAt: '2026-10-24T18:00:00.000Z',
};

const exampleUser = {
  _id: ID_EXAMPLE,
  name: 'Ana Pérez',
  email: 'ana@mail.com',
  role: USER_ROLES.USER,
  createdAt: '2026-10-24T18:00:00.000Z',
  updatedAt: '2026-10-24T18:00:00.000Z',
};

const productValidation = new RequestValidationError([
  { field: 'name', message: 'El nombre es obligatorio y debe ser texto.' },
  { field: 'price', message: 'El precio es obligatorio y debe ser un número.' },
]);
const emptyBody = (message) =>
  new RequestValidationError([{ field: 'body', message }]);

const userValidation = new RequestValidationError([
  { field: 'email', message: 'El email no es válido.' },
  { field: 'password', message: 'La contraseña debe tener al menos 6 caracteres.' },
]);
const invalidRole = new InvalidRoleError('cliente', Object.values(USER_ROLES));

// ============================== Products ==============================

export const productsPaths = {
  '/api/products': {
    get: {
      tags: ['Products'],
      summary: 'Listar productos disponibles',
      description: 'Devuelve solo los productos con stock disponible (status AVAILABLE y stock > 0), del más reciente al más antiguo.',
      operationId: 'listProducts',
      responses: {
        200: okResponse('Lista de productos disponibles.', { type: 'array', items: schemaRef('Product') }, [exampleProduct]),
        ...errorResponses({ method: 'GET', path: '/api/products' }),
      },
    },
    post: {
      tags: ['Products'],
      summary: 'Crear un producto',
      description: 'El estado (AVAILABLE / OUT_OF_STOCK) lo calcula el servidor a partir del stock.',
      operationId: 'createProduct',
      requestBody: {
        required: true,
        content: jsonContent(schemaRef('ProductCreate'), { name: 'Caja chica', description: '20x20', price: 1500, stock: 10 }),
      },
      responses: {
        201: okResponse('Producto creado.', schemaRef('Product'), exampleProduct),
        ...errorResponses({
          method: 'POST',
          path: '/api/products',
          errors: {
            400: [productValidation, new NegativeValueError('price', -5), invalidJson],
          },
        }),
      },
    },
  },
  '/api/products/{id}': {
    parameters: [paramRef('IdParam')],
    get: {
      tags: ['Products'],
      summary: 'Obtener un producto por id',
      operationId: 'getProduct',
      responses: {
        200: okResponse('Producto encontrado.', schemaRef('Product'), exampleProduct),
        ...errorResponses({
          method: 'GET',
          path: `/api/products/${ID_EXAMPLE}`,
          errors: { 400: [invalidId], 404: [new ProductNotFoundError(ID_EXAMPLE)] },
        }),
      },
    },
    put: {
      tags: ['Products'],
      summary: 'Actualizar un producto',
      description: 'Se envía al menos un campo. Si cambia el stock, el estado se recalcula.',
      operationId: 'updateProduct',
      requestBody: {
        required: true,
        content: jsonContent(schemaRef('ProductUpdate'), { price: 1800, stock: 0 }),
      },
      responses: {
        200: okResponse('Producto actualizado.', schemaRef('Product'), { ...exampleProduct, price: 1800, stock: 0, status: PRODUCT_STATUS.OUT_OF_STOCK }),
        ...errorResponses({
          method: 'PUT',
          path: `/api/products/${ID_EXAMPLE}`,
          errors: {
            400: [
              invalidId,
              ['VALIDATION_ERROR', emptyBody('Enviá al menos un campo para actualizar.')],
              new NegativeValueError('stock', -1),
              invalidJson,
            ],
            404: [new ProductNotFoundError(ID_EXAMPLE)],
          },
        }),
      },
    },
    delete: {
      tags: ['Products'],
      summary: 'Eliminar un producto',
      operationId: 'deleteProduct',
      responses: {
        200: okResponse('Producto eliminado.', schemaRef('SuccessMessage'), { message: 'Producto eliminado.' }),
        ...errorResponses({
          method: 'DELETE',
          path: `/api/products/${ID_EXAMPLE}`,
          errors: { 400: [invalidId], 404: [new ProductNotFoundError(ID_EXAMPLE)] },
        }),
      },
    },
  },
};

// ============================== Users ==============================

export const usersPaths = {
  '/api/users': {
    get: {
      tags: ['Users'],
      summary: 'Listar usuarios',
      description: 'Devuelve todos los usuarios, del más reciente al más antiguo. Nunca incluye las contraseñas.',
      operationId: 'listUsers',
      responses: {
        200: okResponse('Lista de usuarios.', { type: 'array', items: schemaRef('User') }, [exampleUser]),
        ...errorResponses({ method: 'GET', path: '/api/users' }),
      },
    },
    post: {
      tags: ['Users'],
      summary: 'Crear un usuario',
      description: 'La contraseña se guarda hasheada y no se devuelve. El email debe ser único. Si no se indica rol, se asigna USER.',
      operationId: 'createUser',
      requestBody: {
        required: true,
        content: jsonContent(schemaRef('UserCreate'), { name: 'Ana Pérez', email: 'ana@mail.com', password: 'secreto123', role: 'USER' }),
      },
      responses: {
        201: okResponse('Usuario creado.', schemaRef('User'), exampleUser),
        ...errorResponses({
          method: 'POST',
          path: '/api/users',
          errors: {
            400: [userValidation, invalidRole, invalidJson],
            409: [new EmailAlreadyExistsError('ana@mail.com')],
          },
        }),
      },
    },
  },
  '/api/users/{id}': {
    parameters: [paramRef('IdParam')],
    get: {
      tags: ['Users'],
      summary: 'Obtener un usuario por id',
      operationId: 'getUser',
      responses: {
        200: okResponse('Usuario encontrado.', schemaRef('User'), exampleUser),
        ...errorResponses({
          method: 'GET',
          path: `/api/users/${ID_EXAMPLE}`,
          errors: { 400: [invalidId], 404: [new UserNotFoundError(ID_EXAMPLE)] },
        }),
      },
    },
    put: {
      tags: ['Users'],
      summary: 'Actualizar un usuario',
      description: 'Se pueden modificar name, password y role (al menos uno). El email no se puede cambiar.',
      operationId: 'updateUser',
      requestBody: {
        required: true,
        content: jsonContent(schemaRef('UserUpdate'), { name: 'Ana María Pérez', role: 'DRIVER' }),
      },
      responses: {
        200: okResponse('Usuario actualizado.', schemaRef('User'), { ...exampleUser, name: 'Ana María Pérez', role: USER_ROLES.DRIVER }),
        ...errorResponses({
          method: 'PUT',
          path: `/api/users/${ID_EXAMPLE}`,
          errors: {
            400: [
              invalidId,
              ['VALIDATION_ERROR', emptyBody('Enviá al menos un campo para actualizar (name, password o role).')],
              invalidRole,
              invalidJson,
            ],
            404: [new UserNotFoundError(ID_EXAMPLE)],
          },
        }),
      },
    },
    delete: {
      tags: ['Users'],
      summary: 'Eliminar un usuario',
      operationId: 'deleteUser',
      responses: {
        200: okResponse('Usuario eliminado.', schemaRef('SuccessMessage'), { message: 'Usuario eliminado.' }),
        ...errorResponses({
          method: 'DELETE',
          path: `/api/users/${ID_EXAMPLE}`,
          errors: { 400: [invalidId], 404: [new UserNotFoundError(ID_EXAMPLE)] },
        }),
      },
    },
  },
};
