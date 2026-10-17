import { randomBytes, randomInt } from 'node:crypto';

// Datos base y helpers aleatorios para el módulo de mocking.
// No conoce Mongoose ni el dominio: son funciones puras de apoyo.

export const FIRST_NAMES = [
  'Ana', 'Luis', 'María', 'Juan', 'Sofía', 'Martín', 'Lucía', 'Diego', 'Camila', 'Mateo',
  'Valentina', 'Nicolás', 'Julieta', 'Federico', 'Carolina', 'Santiago', 'Paula', 'Gonzalo',
  'Florencia', 'Tomás',
];

export const LAST_NAMES = [
  'Pérez', 'Gómez', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Sosa', 'Díaz', 'Romero',
  'Álvarez', 'Torres', 'Ruiz', 'Acosta', 'Benítez', 'Medina', 'Herrera', 'Castro', 'Suárez',
  'Molina', 'Ortiz',
];

export const STREETS = [
  'Av. San Martín', 'Belgrano', 'Rivadavia', 'Colón', '9 de Julio', 'Sarmiento', 'Mitre',
  'Independencia', 'Av. Libertador', 'Córdoba',
];

export const CITIES = [
  'Córdoba', 'Rosario', 'Buenos Aires', 'Mendoza', 'La Plata', 'Salta', 'Tucumán', 'Mar del Plata',
];

export const ITEM_NAMES = [
  'Caja chica', 'Caja mediana', 'Sobre', 'Paquete frágil', 'Bolsa', 'Documentación',
  'Electrodoméstico', 'Ropa', 'Libros', 'Auriculares',
];

export const pick = (list) => list[randomInt(list.length)];

// Entero aleatorio entre min y max, ambos incluidos
export const randomBetween = (min, max) => randomInt(min, max + 1);

// Elige un valor según pesos: [[valor, peso], ...]
export function pickWeighted(entries) {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = randomInt(total);
  for (const [value, weight] of entries) {
    if (roll < weight) return value;
    roll -= weight;
  }
  return entries[entries.length - 1][0];
}

// ObjectId válido (24 caracteres hexadecimales) sin depender de Mongoose
export const randomObjectId = () => randomBytes(12).toString('hex');

// "María Pérez" -> "maria" / "perez" (para armar emails)
export const slug = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

// Fecha desplazada una cantidad de días (negativo = pasado) respecto de ahora
export const daysFromNow = (days, extraHours = 0) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000 + extraHours * 60 * 60 * 1000);
