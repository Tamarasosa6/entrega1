import { ProductRepository } from '../repositories/product.repository.js';
import { PRODUCT_STATUS } from '../constants/index.js';
import {
  ProductNotFoundError,
  RequestValidationError,
  NegativeValueError,
} from '../errors/domain.errors.js';
import { assertValidId, isNonEmptyString } from '../utils/validators.js';

// El estado del producto se deriva del stock (regla de negocio).
function resolveStatus(stock) {
  return stock > 0 ? PRODUCT_STATUS.AVAILABLE : PRODUCT_STATUS.OUT_OF_STOCK;
}

function validateProductData(data = {}, { partial = false } = {}) {
  const { name, price, stock } = data;
  const errors = [];

  if ((!partial || name !== undefined) && !isNonEmptyString(name)) {
    errors.push({ field: 'name', message: 'El nombre es obligatorio y debe ser texto.' });
  }
  if ((!partial || price !== undefined) && (typeof price !== 'number' || Number.isNaN(price))) {
    errors.push({ field: 'price', message: 'El precio es obligatorio y debe ser un número.' });
  }
  if (stock !== undefined && !Number.isInteger(stock)) {
    errors.push({ field: 'stock', message: 'El stock debe ser un número entero.' });
  }
  if (errors.length > 0) throw new RequestValidationError(errors);

  if (typeof price === 'number' && price < 0) throw new NegativeValueError('price', price);
  if (typeof stock === 'number' && stock < 0) throw new NegativeValueError('stock', stock);
}

export const ProductService = {
  // Listado público: solo productos con stock disponible.
  async getAll() {
    return ProductRepository.getAll({
      status: PRODUCT_STATUS.AVAILABLE,
      stock: { $gt: 0 },
    });
  },

  async getById(id) {
    assertValidId(id);
    const product = await ProductRepository.getById(id);
    if (!product) throw new ProductNotFoundError(id);
    return product;
  },

  async create(data) {
    validateProductData(data);
    const stock = data.stock ?? 0;
    return ProductRepository.create({
      name: data.name,
      description: data.description,
      price: data.price,
      stock,
      status: resolveStatus(stock),
    });
  },

  async update(id, data) {
    assertValidId(id);
    if (!data || Object.keys(data).length === 0) {
      throw new RequestValidationError([
        { field: 'body', message: 'Enviá al menos un campo para actualizar.' },
      ]);
    }
    validateProductData(data, { partial: true });

    const changes = { ...data };
    delete changes.status; // el estado nunca se setea a mano
    if (changes.stock !== undefined) {
      changes.status = resolveStatus(changes.stock);
    }
    const product = await ProductRepository.update(id, changes);
    if (!product) throw new ProductNotFoundError(id);
    return product;
  },

  async delete(id) {
    assertValidId(id);
    const product = await ProductRepository.delete(id);
    if (!product) throw new ProductNotFoundError(id);
    return product;
  },
};
