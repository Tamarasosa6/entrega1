import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

logger.fatal = (msg, meta) => logger.log('error', msg, meta);
logger.warning = (msg, meta) => logger.warn(msg, meta);

export const flushLogger = async () => {
  return new Promise((resolve) => {
    logger.on('finish', resolve);
    logger.end();
  });
};

export default logger;
