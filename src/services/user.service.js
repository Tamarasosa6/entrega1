import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user.repository.js';
import { USER_ROLES, HTTP_STATUS } from '../constants/index.js';
import { AppError } from '../utils/AppError.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const SALT_ROUNDS = 10;

function assertValidRole(role) {
  if (!Object.values(USER_ROLES).includes(role)) {
    throw new AppError(
      `Rol inválido. Valores permitidos: ${Object.values(USER_ROLES).join(', ')}.`,
      HTTP_STATUS.BAD_REQUEST
    );
  }
}

export const UserService = {
  async getAll() {
    return UserRepository.getAll();
  },

  async getById(id) {
    const user = await UserRepository.getById(id);
    if (!user) {
      throw new AppError('Usuario no encontrado.', HTTP_STATUS.NOT_FOUND);
    }
    return user;
  },

  async create({ name, email, password, role = USER_ROLES.USER }) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new AppError('El nombre es obligatorio.', HTTP_STATUS.BAD_REQUEST);
    }
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      throw new AppError('El email no es válido.', HTTP_STATUS.BAD_REQUEST);
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      throw new AppError(
        `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
        HTTP_STATUS.BAD_REQUEST
      );
    }
    assertValidRole(role);

    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      throw new AppError('Ya existe un usuario con ese email.', HTTP_STATUS.CONFLICT);
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    return UserRepository.create({ name, email, password: hashedPassword, role });
  },

  async update(id, data) {
    const changes = {};

    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || data.name.trim() === '') {
        throw new AppError('El nombre no puede estar vacío.', HTTP_STATUS.BAD_REQUEST);
      }
      changes.name = data.name;
    }
    if (data.role !== undefined) {
      assertValidRole(data.role);
      changes.role = data.role;
    }
    if (data.password !== undefined) {
      if (typeof data.password !== 'string' || data.password.length < MIN_PASSWORD_LENGTH) {
        throw new AppError(
          `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
          HTTP_STATUS.BAD_REQUEST
        );
      }
      changes.password = await bcrypt.hash(data.password, SALT_ROUNDS);
    }

    const user = await UserRepository.update(id, changes);
    if (!user) {
      throw new AppError('Usuario no encontrado.', HTTP_STATUS.NOT_FOUND);
    }
    return user;
  },

  async delete(id) {
    const user = await UserRepository.delete(id);
    if (!user) {
      throw new AppError('Usuario no encontrado.', HTTP_STATUS.NOT_FOUND);
    }
    return user;
  },
};
