import rateLimit from 'express-rate-limit';
import { apiResponse } from '../utils/apiResponse.js';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return apiResponse.error(
      res,
      'Too many authentication attempts. Please try again after 15 minutes.',
      429,
      'TOO_MANY_REQUESTS'
    );
  }
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return apiResponse.error(
      res,
      'Rate limit exceeded. Please throttle your requests.',
      429,
      'TOO_MANY_REQUESTS'
    );
  }
});
