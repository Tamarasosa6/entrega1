import { ProductRepository } from '../repositories/product.repository.js';
import { PRODUCT_STATUS, HTTP_STATUS } from '../constants/index.js';
import { AppError } from '../utils/AppError.js';

// El estado del producto se deriva del stock (regla de negocio).
function resolveStatus(stock) {
  return stock > 0 ? PRODUCT_STATUS.AVAILABLE : PRODUCT_STATUS.OUT_OF_STOCK;
}

function validateProductData(data, { partial = false } = {}) {
  const { name, price, stock } = data;

  if (!partial || name !== undefined) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new AppError('El nombre es obligatorio.', HTTP_STATUS.BAD_REQUEST);
    }
  }
  if (!partial || price !== undefined) {
    if (typeof price !== 'number' || price < 0) {
      throw new AppError(
        'El precio debe ser un número mayor o igual a 0.',
        HTTP_STATUS.BAD_REQUEST
      );
    }
  }
  if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) {
    throw new AppError(
      'El stock debe ser un entero mayor o igual a 0.',
      HTTP_STATUS.BAD_REQUEST
    );
  }
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
    const product = await ProductRepository.getById(id);
    if (!product) {
      throw new AppError('Producto no encontrado.', HTTP_STATUS.NOT_FOUND);
    }
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
    validateProductData(data, { partial: true });
    const changes = { ...data };
    delete changes.status; // el estado nunca se setea a mano
    if (changes.stock !== undefined) {
      changes.status = resolveStatus(changes.stock);
    }
    const product = await ProductRepository.update(id, changes);
    if (!product) {
      throw new AppError('Producto no encontrado.', HTTP_STATUS.NOT_FOUND);
    }
    return product;
  },

  async delete(id) {
    const product = await ProductRepository.delete(id);
    if (!product) {
      throw new AppError('Producto no encontrado.', HTTP_STATUS.NOT_FOUND);
    }
    return product;
  },
};
