import config from '../config/index.js';
import logger, { loggerInfo } from '../logger/index.js';
import { LOG_LEVELS } from '../constants/index.js';
import { LoggerTestDisabledError } from '../errors/domain.errors.js';

// Cada nivel con su mensaje de prueba (orden de más a menos detallado).
const TEST_MESSAGES = Object.freeze([
  [LOG_LEVELS.DEBUG, 'Mensaje de prueba: debug (detalle para desarrollo)'],
  [LOG_LEVELS.HTTP, 'Mensaje de prueba: http (petición HTTP)'],
  [LOG_LEVELS.INFO, 'Mensaje de prueba: info (evento normal del sistema)'],
  [LOG_LEVELS.WARNING, 'Mensaje de prueba: warning (algo inesperado que no frena la app)'],
  [LOG_LEVELS.ERROR, 'Mensaje de prueba: error (una operación falló)'],
  [LOG_LEVELS.FATAL, 'Mensaje de prueba: fatal (falla crítica)'],
]);

export const LoggerService = {
  // Emite un mensaje por cada nivel. Herramienta interna, no es negocio.
  emitTestLogs() {
    if (config.isProduction) throw new LoggerTestDisabledError();

    const context = { source: 'logger-test' };
    for (const [level, message] of TEST_MESSAGES) {
      logger[level](message, context);
    }

    return {
      message: 'Se emitió un mensaje de prueba por cada nivel de log.',
      emitted: TEST_MESSAGES.map(([level]) => level),
      activeLevel: loggerInfo.level,
      environment: loggerInfo.nodeEnv,
      note: 'En consola y en combined-*.log aparecen los niveles desde el activo hacia los más severos; error-*.log solo guarda error y fatal.',
    };
  },
};
