import { LoggerService } from '../services/logger.service.js';
import { HTTP_STATUS } from '../constants/index.js';

// Solo maneja req/res: delega todo al Service.
export const LoggerController = {
  test(req, res, next) {
    try {
      res.status(HTTP_STATUS.OK).json(LoggerService.emitTestLogs());
    } catch (error) {
      next(error);
    }
  },
};
