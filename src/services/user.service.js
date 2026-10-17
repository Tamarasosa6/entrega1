import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user.repository.js';
import { USER_ROLES } from '../constants/index.js';
import {
  UserNotFoundError,
  EmailAlreadyExistsError,
  InvalidRoleError,
  RequestValidationError,
} from '../errors/domain.errors.js';
import { assertValidId, isNonEmptyString } from '../utils/validators.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const SALT_ROUNDS = 10;

const passwordTooShort = {
  field: 'password',
  message: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
};

const isValidPassword = (password) =>
  typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH;

function assertValidRole(role) {
  if (!Object.values(USER_ROLES).includes(role)) {
    throw new InvalidRoleError(role, Object.values(USER_ROLES));
  }
}

export const UserService = {
  async getAll() {
    return UserRepository.getAll();
  },

  async getById(id) {
    assertValidId(id);
    const user = await UserRepository.getById(id);
    if (!user) throw new UserNotFoundError(id);
    return user;
  },

  async create({ name, email, password, role = USER_ROLES.USER } = {}) {
    const errors = [];
    if (!isNonEmptyString(name)) {
      errors.push({ field: 'name', message: 'El nombre es obligatorio y debe ser texto.' });
    }
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      errors.push({ field: 'email', message: 'El email no es válido.' });
    }
    if (!isValidPassword(password)) errors.push(passwordTooShort);
    if (errors.length > 0) throw new RequestValidationError(errors);

    assertValidRole(role);

    const existing = await UserRepository.findByEmail(email);
    if (existing) throw new EmailAlreadyExistsError(email);

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    return UserRepository.create({ name, email, password: hashedPassword, role });
  },

  async update(id, data = {}) {
    assertValidId(id);

    const errors = [];
    const changes = {};

    if (data.name !== undefined) {
      if (isNonEmptyString(data.name)) changes.name = data.name;
      else errors.push({ field: 'name', message: 'El nombre no puede estar vacío.' });
    }
    if (data.password !== undefined) {
      if (isValidPassword(data.password)) changes.password = data.password;
      else errors.push(passwordTooShort);
    }
    if (errors.length > 0) throw new RequestValidationError(errors);

    if (data.role !== undefined) {
      assertValidRole(data.role);
      changes.role = data.role;
    }
    if (Object.keys(changes).length === 0) {
      throw new RequestValidationError([
        { field: 'body', message: 'Enviá al menos un campo para actualizar (name, password o role).' },
      ]);
    }
    if (changes.password) {
      changes.password = await bcrypt.hash(changes.password, SALT_ROUNDS);
    }

    const user = await UserRepository.update(id, changes);
    if (!user) throw new UserNotFoundError(id);
    return user;
  },

  async delete(id) {
    assertValidId(id);
    const user = await UserRepository.delete(id);
    if (!user) throw new UserNotFoundError(id);
    return user;
  },
};
