import mongoose from 'mongoose';
import { UserModel } from '../models/user.model.js';

// Nunca se devuelve el hash de la contraseña salvo pedido explícito.
const SAFE_PROJECTION = '-password -__v';

export const UserRepository = {
  async getAll() {
    return UserModel.find({}, SAFE_PROJECTION).sort({ createdAt: -1 }).lean();
  },

  async getById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return UserModel.findById(id, SAFE_PROJECTION).lean();
  },

  async findByEmail(email, { includePassword = false } = {}) {
    const projection = includePassword ? '-__v' : SAFE_PROJECTION;
    return UserModel.findOne({ email: email.toLowerCase().trim() }, projection).lean();
  },

  async create(data) {
    const user = await UserModel.create(data);
    return user.toObject({
      versionKey: false,
      transform: (doc, ret) => {
        delete ret.password;
        return ret;
      },
    });
  },

  async getByRole(role, { limit = 100 } = {}) {
    return UserModel.find({ role }, SAFE_PROJECTION).limit(limit).lean();
  },

  async insertMany(users) {
    const inserted = await UserModel.insertMany(users);
    return inserted.length;
  },

  async update(id, data) {
    if (!mongoose.isValidObjectId(id)) return null;
    return UserModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
      projection: SAFE_PROJECTION,
    }).lean();
  },

  async delete(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return UserModel.findByIdAndDelete(id, { projection: SAFE_PROJECTION }).lean();
  },
};
