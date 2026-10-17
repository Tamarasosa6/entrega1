import mongoose from 'mongoose';
import { ProductModel } from '../models/product.model.js';

// Proyección por defecto: oculta campos internos de Mongoose
const DEFAULT_PROJECTION = '-__v';

// Único lugar (junto con UserRepository) que conoce Mongoose/MongoDB.
export const ProductRepository = {
  async getAll(filters = {}) {
    return ProductModel.find(filters, DEFAULT_PROJECTION)
      .sort({ createdAt: -1 })
      .lean();
  },

  async getById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return ProductModel.findById(id, DEFAULT_PROJECTION).lean();
  },

  async create(data) {
    const product = await ProductModel.create(data);
    return product.toObject({ versionKey: false });
  },

  async update(id, data) {
    if (!mongoose.isValidObjectId(id)) return null;
    return ProductModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
      projection: DEFAULT_PROJECTION,
    }).lean();
  },

  async delete(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return ProductModel.findByIdAndDelete(id, {
      projection: DEFAULT_PROJECTION,
    }).lean();
  },
};
