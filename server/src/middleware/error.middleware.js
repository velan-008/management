import { apiResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error(`Unhandled Error [${req.method} ${req.originalUrl}]: ${err.message}`, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // Handle Zod Validation Errors
  if (err.name === 'ZodError') {
    const formattedDetails = err.errors.map((e) => ({
      field: e.path.join('.'),
      issue: e.message
    }));
    return apiResponse.error(res, 'Request validation failed', 400, 'VALIDATION_ERROR', formattedDetails);
  }

  // Handle Sequelize Unique Constraint Violation
  if (err.name === 'SequelizeUniqueConstraintError') {
    const details = err.errors ? err.errors.map((e) => ({
      field: e.path,
      issue: e.message
    })) : [];
    return apiResponse.error(res, 'A record with these unique details already exists', 409, 'CONFLICT', details);
  }

  // Handle Sequelize Validation Error
  if (err.name === 'SequelizeValidationError') {
    const details = err.errors.map((e) => ({
      field: e.path,
      issue: e.message
    }));
    return apiResponse.error(res, 'Database record validation failed', 400, 'DATABASE_VALIDATION_ERROR', details);
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return apiResponse.error(res, 'Invalid authentication token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    return apiResponse.error(res, 'Authentication token has expired', 401, 'TOKEN_EXPIRED');
  }

  // Handle custom status errors
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'An unexpected internal error occurred'
    : err.message || 'Internal server error';

  const code = err.code || (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR');

  return apiResponse.error(res, message, statusCode, code, err.details || []);
};
