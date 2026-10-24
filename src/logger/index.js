import path from 'node:path';
import { fileURLToPath } from 'node:url';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { LOG_LEVELS } from '../constants/index.js';

// Logger centralizado. Se importa igual desde cualquier archivo:
//   import logger from '../logger/index.js';
//   logger.info('mensaje', { dato: 1 });
//
// Su configuración depende del entorno (NODE_ENV / LOG_LEVEL). Si la
// configuración de entorno es inválida, el logger igual se crea (con valores
// de respaldo) para poder registrar ese error como `fatal` antes de salir.

let config = null;
try {
  config = (await import('../config/index.js')).default;
} catch {
  // Sin configuración válida: se usa el respaldo de más abajo.
}

const nodeEnv = config?.nodeEnv ?? 'development';
const isProduction = config?.isProduction ?? false;
const isTest = config?.isTest ?? false;
const level = config?.logLevel ?? LOG_LEVELS.DEBUG;

export const LOG_DIR = fileURLToPath(new URL('../../logs', import.meta.url));

// Menor número = más severo. Un transport con level "error" recibe error y fatal.
const levels = {
  [LOG_LEVELS.FATAL]: 0,
  [LOG_LEVELS.ERROR]: 1,
  [LOG_LEVELS.WARNING]: 2,
  [LOG_LEVELS.INFO]: 3,
  [LOG_LEVELS.HTTP]: 4,
  [LOG_LEVELS.DEBUG]: 5,
};

const colors = {
  [LOG_LEVELS.FATAL]: 'bold magenta',
  [LOG_LEVELS.ERROR]: 'red',
  [LOG_LEVELS.WARNING]: 'yellow',
  [LOG_LEVELS.INFO]: 'green',
  [LOG_LEVELS.HTTP]: 'cyan',
  [LOG_LEVELS.DEBUG]: 'blue',
};

const { createLogger, format, transports } = winston;
const colorizer = format.colorize({ colors });

// "2026-08-01 10:12:03 [info]    mensaje {"dato":1}"
// y, si hay stack, en las líneas siguientes.
function render(info, { colorize }) {
  const { timestamp, level: lvl, message, stack, ...meta } = info;
  const tag = `[${lvl}]`.padEnd(10);
  const coloredTag = colorize ? colorizer.colorize(lvl, tag) : tag;
  const metaText = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  const stackText = stack ? `\n${stack}` : '';
  return `${timestamp} ${coloredTag}${message}${metaText}${stackText}`;
}

const baseFormat = format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' });

const consoleTransport = new transports.Console({
  format: format.combine(
    baseFormat,
    format.printf((info) => render(info, { colorize: !isProduction }))
  ),
});

const fileFormat = format.combine(
  baseFormat,
  format.printf((info) => render(info, { colorize: false }))
);

// Rotación diaria: un archivo por día, máximo 20 MB cada uno, se conservan
// 14 días y los archivos viejos se comprimen (.gz).
const rotationOptions = {
  dirname: LOG_DIR,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: fileFormat,
};

const logger = createLogger({
  levels,
  level,
  silent: isTest, // en tests no se escribe nada
  exitOnError: false,
  transports: [
    consoleTransport,
    // Solo error y fatal
    new DailyRotateFile({
      ...rotationOptions,
      filename: 'error-%DATE%.log',
      level: LOG_LEVELS.ERROR,
    }),
    // Todo lo que el entorno permita (en desarrollo incluye debug)
    new DailyRotateFile({
      ...rotationOptions,
      filename: 'combined-%DATE%.log',
      level,
    }),
  ],
});

// Cierra el logger esperando a que se escriban los archivos pendientes.
// Se usa antes de process.exit() para no perder el último mensaje (fatal).
export function flushLogger(timeoutMs = 1500) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    logger.once('finish', () => {
      clearTimeout(timer);
      resolve();
    });
    logger.end();
  });
}

export const loggerInfo = Object.freeze({
  nodeEnv,
  level,
  levels: Object.keys(levels),
  directory: LOG_DIR,
});

export default logger;
