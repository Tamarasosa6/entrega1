import mongoose from 'mongoose';
import { USER_ROLES } from '../constants/index.js';
import { fileSchema } from './file.schema.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
    },
    // Metadatos de los documentos subidos (DNI, licencia, etc.)
    documents: { type: [fileSchema], default: [] },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model('User', userSchema);
